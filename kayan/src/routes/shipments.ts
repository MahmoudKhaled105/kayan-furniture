import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, roundMoney } from '../utils';
import { roleMiddleware } from '../middleware/auth';

async function recalcPaymentStatus(db: D1Database, shipmentId: number) {
	const shipment = await db.prepare('SELECT declared_value FROM shipment WHERE id = ?').bind(shipmentId).first<any>();
	if (!shipment) return;

	const paid = await db.prepare(
		'SELECT COALESCE(SUM(amount), 0) AS total FROM shipment_installment WHERE shipment_id = ? AND is_paid = 1'
	).bind(shipmentId).first<any>();

	const totalPaid = paid?.total ?? 0;
	let status = 'unpaid';
	if (totalPaid >= shipment.declared_value) status = 'settled';
	else if (totalPaid > 0) status = 'partial';

	await db.prepare('UPDATE shipment SET payment_status = ? WHERE id = ?').bind(status, shipmentId).run();
}

export function registerShipmentRoutes(router: Router) {
	// GET /api/v1/shipments
	router.get('api/v1/shipments', roleMiddleware(['admin'], async (_req, env, _params, query) => {
		let sql = `
			SELECT sh.id, sh.supplier_id, s.name AS supplier_name, sh.date_received,
				   sh.declared_value, sh.payment_status, sh.partial_delivery,
				   COALESCE(paid.total_paid, 0) AS amount_paid,
				   sh.declared_value - COALESCE(paid.total_paid, 0) AS remaining_balance
			FROM shipment sh
			JOIN supplier s ON s.id = sh.supplier_id
			LEFT JOIN (
				SELECT shipment_id, SUM(amount) AS total_paid
				FROM shipment_installment WHERE is_paid = 1
				GROUP BY shipment_id
			) paid ON paid.shipment_id = sh.id
		`;

		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.supplier_id) {
			conditions.push('sh.supplier_id = ?');
			bindings.push(parseInt(query.supplier_id));
		}
		if (query.payment_status) {
			conditions.push('sh.payment_status = ?');
			bindings.push(query.payment_status);
		}
		if (query.date_from) {
			conditions.push('sh.date_received >= ?');
			bindings.push(query.date_from);
		}
		if (query.date_to) {
			conditions.push('sh.date_received <= ?');
			bindings.push(query.date_to);
		}

		if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
		sql += ' ORDER BY sh.date_received DESC';

		const stmt = env.DB.prepare(sql);
		const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
		return jsonResponse(results);
	}));

	// POST /api/v1/shipments
	router.post('api/v1/shipments', roleMiddleware(['admin'], async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.supplier_id) return errorResponse('validation_error', 'supplier_id is required', 400);
		if (!body.date_received) return errorResponse('validation_error', 'date_received is required', 400);
		if (body.declared_value == null) return errorResponse('validation_error', 'declared_value is required', 400);

		// Check supplier exists
		const supplier = await env.DB.prepare('SELECT id FROM supplier WHERE id = ?').bind(body.supplier_id).first();
		if (!supplier) return errorResponse('not_found', `Supplier with id ${body.supplier_id} was not found.`, 404);

		const result = await env.DB.prepare(
			'INSERT INTO shipment (supplier_id, date_received, declared_value, partial_delivery, notes, container_number, estimated_arrival, delivery_status, shipping_status, image_url, account_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(
			body.supplier_id,
			body.date_received,
			body.declared_value,
			body.partial_delivery ? 1 : 0,
			body.notes || null,
			body.container_number || null,
			body.estimated_arrival || null,
			body.delivery_status || 'pending',
			body.delivery_status || 'pending', // Also set shipping_status
			body.image_url || null,
			body.account_notes || null
		).run();

		const shipmentId = result.meta.last_row_id;

		// Create installments if provided
		const installments: any[] = [];
		if (Array.isArray(body.installments)) {
			for (const inst of body.installments) {
				const isPaidValue = (inst.is_paid === true || inst.is_paid === 1 || inst.is_paid === 'true') ? 1 : 0;
				const instResult = await env.DB.prepare(
					'INSERT INTO shipment_installment (shipment_id, amount, due_date, is_paid, paid_date) VALUES (?, ?, ?, ?, ?)'
				).bind(
					shipmentId, 
					inst.amount, 
					inst.due_date, 
					isPaidValue, 
					inst.paid_date || (isPaidValue ? body.date_received : null)
				).run();
				const created = await env.DB.prepare('SELECT * FROM shipment_installment WHERE id = ?')
					.bind(instResult.meta.last_row_id).first();
				installments.push(created);
			}
		}

		// Recalculate payment status for the shipment
		await recalcPaymentStatus(env.DB, shipmentId);

		const shipment = await env.DB.prepare('SELECT * FROM shipment WHERE id = ?').bind(shipmentId).first();
		return jsonResponse({ ...shipment, installments }, 201);
	}));

	// GET /api/v1/shipments/:id
	router.get('api/v1/shipments/:id', roleMiddleware(['admin'], async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const shipment = await env.DB.prepare(`
			SELECT sh.*, s.name AS supplier_name,
				   COALESCE(paid.total_paid, 0) AS amount_paid,
				   sh.declared_value - COALESCE(paid.total_paid, 0) AS remaining_balance
			FROM shipment sh
			JOIN supplier s ON s.id = sh.supplier_id
			LEFT JOIN (
				SELECT shipment_id, SUM(amount) AS total_paid
				FROM shipment_installment WHERE is_paid = 1
				GROUP BY shipment_id
			) paid ON paid.shipment_id = sh.id
			WHERE sh.id = ?
		`).bind(id).first();

		if (!shipment) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const { results: installments } = await env.DB.prepare(
			'SELECT * FROM shipment_installment WHERE shipment_id = ? ORDER BY due_date'
		).bind(id).all();

		return jsonResponse({ ...shipment, installments });
	}));

	// PATCH /api/v1/shipments/:id
	router.patch('api/v1/shipments/:id', roleMiddleware(['admin'], async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM shipment WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['date_received', 'declared_value', 'partial_delivery', 'notes', 'container_number', 'estimated_arrival', 'delivery_status', 'image_url', 'account_notes'];

		for (const key of allowed) {
			if (key in body) {
				if (key === 'partial_delivery') {
					fields.push(`${key} = ?`);
					values.push(body[key] ? 1 : 0);
				} else {
					fields.push(`${key} = ?`);
					values.push(body[key]);
				}
			}
		}

		if (fields.length > 0) {
			values.push(id);
			await env.DB.prepare(`UPDATE shipment SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		const updated = await env.DB.prepare('SELECT * FROM shipment WHERE id = ?').bind(id).first();
		return jsonResponse(updated);
	}));

	// GET /api/v1/shipments/:id/installments
	router.get('api/v1/shipments/:id/installments', roleMiddleware(['admin'], async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const shipment = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(id).first();
		if (!shipment) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(
			'SELECT * FROM shipment_installment WHERE shipment_id = ? ORDER BY due_date'
		).bind(id).all();
		return jsonResponse(results);
	}));

	// POST /api/v1/shipments/:id/installments
	router.post('api/v1/shipments/:id/installments', roleMiddleware(['admin'], async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const shipment = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(id).first();
		if (!shipment) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		if (!body.amount) return errorResponse('validation_error', 'amount is required', 400);
		if (!body.due_date) return errorResponse('validation_error', 'due_date is required', 400);

		const result = await env.DB.prepare(
			'INSERT INTO shipment_installment (shipment_id, amount, due_date) VALUES (?, ?, ?)'
		).bind(id, body.amount, body.due_date).run();

		const installment = await env.DB.prepare('SELECT * FROM shipment_installment WHERE id = ?')
			.bind(result.meta.last_row_id).first();

		return jsonResponse(installment, 201);
	}));

	// PATCH /api/v1/shipments/:id/installments/:inst_id
	router.patch('api/v1/shipments/:id/installments/:inst_id', roleMiddleware(['admin'], async (req, env, params) => {
		const shipmentId = parseId(params.id);
		const instId = parseId(params.inst_id);
		if (!shipmentId || !instId) return errorResponse('validation_error', 'Invalid ID', 400);

		const shipment = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(shipmentId).first();
		if (!shipment) return errorResponse('not_found', `Shipment with id ${shipmentId} was not found.`, 404);

		const installment = await env.DB.prepare(
			'SELECT * FROM shipment_installment WHERE id = ? AND shipment_id = ?'
		).bind(instId, shipmentId).first();
		if (!installment) return errorResponse('not_found', `Installment with id ${instId} was not found.`, 404);

		const body = await readBody(req) as any;
		if (body.is_paid == null) return errorResponse('validation_error', 'is_paid is required', 400);

		const isPaid = body.is_paid ? 1 : 0;
		const paidDate = isPaid ? (body.paid_date || new Date().toISOString().slice(0, 10)) : null;

		await env.DB.prepare(
			'UPDATE shipment_installment SET is_paid = ?, paid_date = ? WHERE id = ?'
		).bind(isPaid, paidDate, instId).run();

		// Create/Update transaction_log outflow
		if (isPaid) {
			// Get shipment info for location_id
			const shipInfo = await env.DB.prepare('SELECT location_id FROM item WHERE shipment_id = ? LIMIT 1').bind(shipmentId).first<any>();
			
			await env.DB.prepare(`
				INSERT INTO transaction_log (transaction_date, type, direction, amount, location_id, source_table, source_id, notes)
				VALUES (?, 'supplier', 'outflow', ?, ?, 'SHIPMENT_INSTALLMENT', ?, ?)
			`).bind(paidDate, installment.amount, shipInfo?.location_id || null, instId, `Payment for shipment #${shipmentId}`).run();
		} else {
			// If payment reversed, delete from log
			await env.DB.prepare(
				"DELETE FROM transaction_log WHERE source_table = 'SHIPMENT_INSTALLMENT' AND source_id = ?"
			).bind(instId).run();
		}

		await recalcPaymentStatus(env.DB, shipmentId);

		const updated = await env.DB.prepare('SELECT * FROM shipment_installment WHERE id = ?').bind(instId).first();
		const shipmentAfter = await env.DB.prepare('SELECT payment_status FROM shipment WHERE id = ?').bind(shipmentId).first<any>();

		return jsonResponse({ ...updated, payment_status: shipmentAfter?.payment_status });
	}));

	// GET /api/v1/shipments/:id/manifest
	router.get('api/v1/shipments/:id/manifest', roleMiddleware(['admin'], async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const shipment = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(id).first();
		if (!shipment) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(`
			SELECT i.id, i.name, i.category, i.status, i.location_id,
				   l.name AS location_name, i.purchase_value, i.sale_price
			FROM item i
			JOIN location l ON l.id = i.location_id
			WHERE i.shipment_id = ?
			ORDER BY i.id
		`).bind(id).all();

		return jsonResponse(results);
	}));

	// GET /api/v1/shipments/:id/stats
	router.get('api/v1/shipments/:id/stats', roleMiddleware(['admin'], async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid shipment ID', 400);

		const shipment = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(id).first();
		if (!shipment) return errorResponse('not_found', `Shipment with id ${id} was not found.`, 404);

		const { results: statusStats } = await env.DB.prepare(`
			SELECT status, COUNT(*) AS count
			FROM item
			WHERE shipment_id = ?
			GROUP BY status
		`).bind(id).all();

		const financials = await env.DB.prepare(`
			SELECT SUM(purchase_value) AS total_purchase,
				   SUM(sale_price) AS total_sale
			FROM item
			WHERE shipment_id = ?
		`).bind(id).first<any>();

		return jsonResponse({
			shipment_id: id,
			status_distribution: statusStats,
			financials: {
				total_purchase: Math.round((financials?.total_purchase || 0) * 100) / 100,
				total_sale: Math.round((financials?.total_sale || 0) * 100) / 100
			}
		});
	}));
}
