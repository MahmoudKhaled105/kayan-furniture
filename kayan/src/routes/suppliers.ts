import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody } from '../utils';

export function registerSupplierRoutes(router: Router) {
	// GET /api/v1/suppliers
	router.get('api/v1/suppliers', async (_req, env, _params, query) => {
		let sql = `
			SELECT s.id, s.name, s.phone, s.status,
				COALESCE(ship_totals.total_declared, 0) - COALESCE(paid_totals.total_paid, 0) AS outstanding_balance,
				COALESCE(paid_totals.total_paid, 0) AS total_paid_lifetime
			FROM supplier s
			LEFT JOIN (
				SELECT supplier_id, SUM(declared_value) AS total_declared
				FROM shipment GROUP BY supplier_id
			) ship_totals ON ship_totals.supplier_id = s.id
			LEFT JOIN (
				SELECT sh.supplier_id, SUM(si.amount) AS total_paid
				FROM shipment_installment si
				JOIN shipment sh ON sh.id = si.shipment_id
				WHERE si.is_paid = 1
				GROUP BY sh.supplier_id
			) paid_totals ON paid_totals.supplier_id = s.id
		`;

		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.status) {
			conditions.push('s.status = ?');
			bindings.push(query.status);
		}

		if (conditions.length > 0) {
			sql += ' WHERE ' + conditions.join(' AND ');
		}

		if (query.has_balance === 'true') {
			sql += (conditions.length > 0 ? ' AND' : ' WHERE') +
				' (COALESCE(ship_totals.total_declared, 0) - COALESCE(paid_totals.total_paid, 0)) > 0';
		}

		sql += ' ORDER BY s.id';

		const stmt = env.DB.prepare(sql);
		const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

		// Round money values
		const data = (results as any[]).map((r) => ({
			...r,
			outstanding_balance: Math.round((r.outstanding_balance as number) * 100) / 100,
			total_paid_lifetime: Math.round((r.total_paid_lifetime as number) * 100) / 100,
		}));

		return jsonResponse(data);
	});

	// POST /api/v1/suppliers
	router.post('api/v1/suppliers', async (req, env) => {
		const body = await readBody(req);
		const { name, phone, address, notes, status } = body as any;

		if (!name || typeof name !== 'string' || name.trim() === '') {
			return errorResponse('validation_error', 'name is required', 400);
		}

		const finalStatus = status || 'active';
		if (!['active', 'inactive'].includes(finalStatus)) {
			return errorResponse('validation_error', 'status must be active or inactive', 400);
		}

		const result = await env.DB.prepare(
			'INSERT INTO supplier (name, phone, address, notes, status) VALUES (?, ?, ?, ?, ?)'
		).bind(name.trim(), phone || null, address || null, notes || null, finalStatus).run();

		const supplier = await env.DB.prepare('SELECT * FROM supplier WHERE id = ?')
			.bind(result.meta.last_row_id).first();

		return jsonResponse(supplier, 201);
	});

	// GET /api/v1/suppliers/:id
	router.get('api/v1/suppliers/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid supplier ID', 400);

		const supplier = await env.DB.prepare('SELECT * FROM supplier WHERE id = ?').bind(id).first();
		if (!supplier) return errorResponse('not_found', `Supplier with id ${id} was not found.`, 404);

		return jsonResponse(supplier);
	});

	// PATCH /api/v1/suppliers/:id
	router.patch('api/v1/suppliers/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid supplier ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM supplier WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Supplier with id ${id} was not found.`, 404);

		const body = await readBody(req);
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['name', 'phone', 'address', 'notes', 'status'];

		for (const key of allowed) {
			if (key in (body as any)) {
				fields.push(`${key} = ?`);
				values.push((body as any)[key]);
			}
		}

		if (fields.length === 0) {
			return jsonResponse(existing);
		}

		values.push(id);
		await env.DB.prepare(`UPDATE supplier SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

		const updated = await env.DB.prepare('SELECT * FROM supplier WHERE id = ?').bind(id).first();
		return jsonResponse(updated);
	});

	// GET /api/v1/suppliers/:id/shipments
	router.get('api/v1/suppliers/:id/shipments', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid supplier ID', 400);

		const supplier = await env.DB.prepare('SELECT id FROM supplier WHERE id = ?').bind(id).first();
		if (!supplier) return errorResponse('not_found', `Supplier with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(`
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
			WHERE sh.supplier_id = ?
			ORDER BY sh.date_received DESC
		`).bind(id).all();

		return jsonResponse(results);
	});
}
