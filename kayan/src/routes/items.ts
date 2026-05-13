import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, today } from '../utils';

export function registerItemRoutes(router: Router) {
	// GET /api/v1/items
	router.get('api/v1/items', async (_req, env, _params, query) => {
		let sql = `
			SELECT i.id, i.name, i.category, i.status, i.location_id,
				   l.name AS location_name, i.purchase_value, i.sale_price, i.shipment_id,
				   (SELECT url FROM item_image WHERE item_id = i.id ORDER BY id LIMIT 1) as thumbnail_url
			FROM item i
			JOIN location l ON l.id = i.location_id
		`;
		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.location_id) {
			conditions.push('i.location_id = ?');
			bindings.push(parseInt(query.location_id));
		}
		if (query.status) {
			conditions.push('i.status = ?');
			bindings.push(query.status);
		}
		if (query.category) {
			conditions.push('i.category = ?');
			bindings.push(query.category);
		}
		if (query.search) {
			conditions.push('i.name LIKE ?');
			bindings.push(`%${query.search}%`);
		}

		if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
		sql += ' ORDER BY i.id';

		const stmt = env.DB.prepare(sql);
		const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();
		return jsonResponse(results);
	});

	// POST /api/v1/items
	router.post('api/v1/items', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.name || typeof body.name !== 'string') return errorResponse('validation_error', 'name is required', 400);
		if (!body.location_id) return errorResponse('validation_error', 'location_id is required', 400);
		if (body.purchase_value == null) return errorResponse('validation_error', 'purchase_value is required', 400);

		// Validate location
		const loc = await env.DB.prepare('SELECT id FROM location WHERE id = ?').bind(body.location_id).first();
		if (!loc) return errorResponse('not_found', `Location with id ${body.location_id} was not found.`, 404);

		// Validate shipment if provided
		if (body.shipment_id) {
			const ship = await env.DB.prepare('SELECT id FROM shipment WHERE id = ?').bind(body.shipment_id).first();
			if (!ship) return errorResponse('not_found', `Shipment with id ${body.shipment_id} was not found.`, 404);
		}

		const result = await env.DB.prepare(
			'INSERT INTO item (shipment_id, location_id, name, category, description, purchase_value, sale_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(
			body.shipment_id || null,
			body.location_id,
			body.name.trim(),
			body.category || null,
			body.description || null,
			body.purchase_value,
			body.sale_price || 0,
			'in_storage'
		).run();

		const itemId = result.meta.last_row_id;

		// Handle part_ids
		if (Array.isArray(body.part_ids)) {
			for (const partId of body.part_ids) {
				await env.DB.prepare(
					'INSERT INTO item_part (parent_item_id, part_item_id) VALUES (?, ?)'
				).bind(itemId, partId).run();
			}
		}

		// Handle images
		if (Array.isArray(body.images)) {
			for (const url of body.images) {
				if (typeof url === 'string' && url.trim()) {
					await env.DB.prepare(
						'INSERT INTO item_image (item_id, url) VALUES (?, ?)'
					).bind(itemId, url.trim()).run();
				}
			}
		}

		const item = await env.DB.prepare(`
			SELECT i.*, l.name AS location_name FROM item i
			JOIN location l ON l.id = i.location_id WHERE i.id = ?
		`).bind(itemId).first<any>();

		if (item) {
			const { results: imgs } = await env.DB.prepare('SELECT url FROM item_image WHERE item_id = ?').bind(itemId).all();
			item.images = imgs.map((img: any) => img.url);
		}

		return jsonResponse(item, 201);
	});

	// GET /api/v1/items/:id
	router.get('api/v1/items/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid item ID', 400);

		const item = await env.DB.prepare(`
			SELECT i.*, l.name AS location_name FROM item i
			JOIN location l ON l.id = i.location_id WHERE i.id = ?
		`).bind(id).first();

		if (!item) return errorResponse('not_found', `Item with id ${id} was not found.`, 404);

		const { results: parts } = await env.DB.prepare(
			'SELECT part_item_id FROM item_part WHERE parent_item_id = ?'
		).bind(id).all();

		const { results: images } = await env.DB.prepare(
			'SELECT url FROM item_image WHERE item_id = ?'
		).bind(id).all();

		return jsonResponse({
			...item,
			part_ids: parts.map((p: any) => p.part_item_id),
			images: images.map((img: any) => img.url)
		});
	});

	// PATCH /api/v1/items/:id
	router.patch('api/v1/items/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid item ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM item WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Item with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['name', 'category', 'description', 'purchase_value', 'sale_price', 'status', 'location_id', 'shipment_id'];

		for (const key of allowed) {
			if (key in body) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length > 0) {
			values.push(id);
			await env.DB.prepare(`UPDATE item SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		// Update images if provided
		if (Array.isArray(body.images)) {
			// Simple approach: delete all and re-insert
			await env.DB.prepare('DELETE FROM item_image WHERE item_id = ?').bind(id).run();
			for (const url of body.images) {
				if (typeof url === 'string' && url.trim()) {
					await env.DB.prepare(
						'INSERT INTO item_image (item_id, url) VALUES (?, ?)'
					).bind(id, url.trim()).run();
				}
			}
		}

		const updated = await env.DB.prepare(`
			SELECT i.*, l.name AS location_name FROM item i
			JOIN location l ON l.id = i.location_id WHERE i.id = ?
		`).bind(id).first<any>();

		if (updated) {
			const { results: imgs } = await env.DB.prepare('SELECT url FROM item_image WHERE item_id = ?').bind(id).all();
			updated.images = imgs.map((img: any) => img.url);
		}

		return jsonResponse(updated);
	});

	// POST /api/v1/items/:id/transfer
	router.post('api/v1/items/:id/transfer', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid item ID', 400);

		const item = await env.DB.prepare('SELECT * FROM item WHERE id = ?').bind(id).first<any>();
		if (!item) return errorResponse('not_found', `Item with id ${id} was not found.`, 404);
		if (item.status === 'sold') return errorResponse('conflict', 'Cannot transfer a sold item.', 409);

		const body = await readBody(req) as any;
		if (!body.to_location_id) return errorResponse('validation_error', 'to_location_id is required', 400);
		if (!body.transfer_date) return errorResponse('validation_error', 'transfer_date is required', 400);

		if (body.to_location_id === item.location_id) {
			return errorResponse('validation_error', 'to_location_id is the same as current location', 400);
		}

		const toLoc = await env.DB.prepare('SELECT id FROM location WHERE id = ?').bind(body.to_location_id).first();
		if (!toLoc) return errorResponse('not_found', `Location with id ${body.to_location_id} was not found.`, 404);

		// Create transfer record
		const transferResult = await env.DB.prepare(`
			INSERT INTO item_transfer (item_id, from_location_id, to_location_id, transfer_date, transport_cost, vehicle, transporter_id, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id,
			item.location_id,
			body.to_location_id,
			body.transfer_date,
			body.transport_cost || 0,
			body.vehicle || null,
			body.transporter_id || null,
			body.notes || null
		).run();

		const transferId = transferResult.meta.last_row_id;

		// Update item location
		await env.DB.prepare('UPDATE item SET location_id = ?, status = ? WHERE id = ?')
			.bind(body.to_location_id, 'in_storage', id).run();

		// If transporter assigned, create work_log entry
		if (body.transporter_id) {
			const person = await env.DB.prepare('SELECT rate FROM person WHERE id = ?').bind(body.transporter_id).first<any>();
			const earned = person ? person.rate : 0;

			await env.DB.prepare(`
				INSERT INTO work_log (person_id, location_id, log_date, log_type, quantity, amount_earned, transfer_id, notes)
				VALUES (?, ?, ?, 'trip', 1, ?, ?, ?)
			`).bind(
				body.transporter_id,
				body.to_location_id,
				body.transfer_date,
				earned,
				transferId,
				body.notes || null
			).run();
		}

		// If transport_cost > 0, create transaction_log outflow
		if (body.transport_cost && body.transport_cost > 0) {
			await env.DB.prepare(`
				INSERT INTO transaction_log (transaction_date, type, direction, amount, location_id, source_table, source_id, notes)
				VALUES (?, 'transport', 'outflow', ?, ?, 'ITEM_TRANSFER', ?, ?)
			`).bind(
				body.transfer_date,
				body.transport_cost,
				body.to_location_id,
				transferId,
				body.notes || null
			).run();
		}

		const transfer = await env.DB.prepare('SELECT * FROM item_transfer WHERE id = ?').bind(transferId).first();
		return jsonResponse(transfer, 201);
	});

	// GET /api/v1/items/:id/transfers
	router.get('api/v1/items/:id/transfers', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid item ID', 400);

		const item = await env.DB.prepare('SELECT id FROM item WHERE id = ?').bind(id).first();
		if (!item) return errorResponse('not_found', `Item with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(`
			SELECT t.*, fl.name AS from_location_name, tl.name AS to_location_name
			FROM item_transfer t
			JOIN location fl ON fl.id = t.from_location_id
			JOIN location tl ON tl.id = t.to_location_id
			WHERE t.item_id = ?
			ORDER BY t.transfer_date DESC
		`).bind(id).all();

		return jsonResponse(results);
	});

	// DELETE /api/v1/items/:id
	router.delete('api/v1/items/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid item ID', 400);

		// Check if item is sold or reserved
		const item = await env.DB.prepare('SELECT status FROM item WHERE id = ?').bind(id).first<any>();
		if (!item) return errorResponse('not_found', `Item with id ${id} was not found.`, 404);
		
		if (item.status === 'sold') {
			return errorResponse('conflict', 'Cannot delete a sold item.', 409);
		}

		await env.DB.prepare('DELETE FROM item WHERE id = ?').bind(id).run();
		return jsonResponse({ success: true });
	});
}
