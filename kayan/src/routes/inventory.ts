import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, roundMoney } from '../utils';

/**
 * Register Inventory routes for bulk items
 */
export function registerInventoryRoutes(router: Router) {
	// GET /api/v1/inventory
	router.get('api/v1/inventory', async (_req, env, _params, query) => {
		let sql = `
			SELECT i.*, l.name AS location_name
			FROM inventory i
			LEFT JOIN location l ON l.id = i.location_id
		`;
		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.location_id) {
			conditions.push('i.location_id = ?');
			bindings.push(parseInt(query.location_id));
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
		sql += ' ORDER BY i.name';

		const { results } = await env.DB.prepare(sql).bind(...bindings).all();
		return jsonResponse(results);
	});

	// POST /api/v1/inventory
	router.post('api/v1/inventory', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.name) return errorResponse('validation_error', 'name is required', 400);
		
		const qty = body.quantity || 0;
		const unitPrice = body.unit_price || 0;
		const totalValue = roundMoney(qty * unitPrice);

		const result = await env.DB.prepare(
			'INSERT INTO inventory (name, category, location_id, quantity, unit_price, total_value) VALUES (?, ?, ?, ?, ?, ?)'
		).bind(
			body.name.trim(),
			body.category || null,
			body.location_id || null,
			qty,
			unitPrice,
			totalValue
		).run();

		const item = await env.DB.prepare('SELECT * FROM inventory WHERE id = ?').bind(result.meta.last_row_id).first();
		return jsonResponse(item, 201);
	});

	// GET /api/v1/inventory/:id
	router.get('api/v1/inventory/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid inventory ID', 400);

		const item = await env.DB.prepare(`
			SELECT i.*, l.name AS location_name 
			FROM inventory i 
			LEFT JOIN location l ON l.id = i.location_id 
			WHERE i.id = ?
		`).bind(id).first();

		if (!item) return errorResponse('not_found', `Inventory item with id ${id} was not found.`, 404);
		return jsonResponse(item);
	});

	// PATCH /api/v1/inventory/:id
	router.patch('api/v1/inventory/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid inventory ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM inventory WHERE id = ?').bind(id).first<any>();
		if (!existing) return errorResponse('not_found', `Inventory item with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['name', 'category', 'location_id', 'quantity', 'unit_price'];

		for (const key of allowed) {
			if (key in body) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length > 0) {
			const newQty = 'quantity' in body ? body.quantity : existing.quantity;
			const newUnitPrice = 'unit_price' in body ? body.unit_price : existing.unit_price;
			fields.push('total_value = ?');
			values.push(roundMoney(newQty * newUnitPrice));
			fields.push('updated_at = CURRENT_TIMESTAMP');

			values.push(id);
			await env.DB.prepare(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		const updated = await env.DB.prepare('SELECT * FROM inventory WHERE id = ?').bind(id).first();
		return jsonResponse(updated);
	});

	// DELETE /api/v1/inventory/:id
	router.delete('api/v1/inventory/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid inventory ID', 400);

		const result = await env.DB.prepare('DELETE FROM inventory WHERE id = ?').bind(id).run();
		if (result.meta.changes === 0) return errorResponse('not_found', `Inventory item with id ${id} was not found.`, 404);

		return jsonResponse({ success: true });
	});

	// GET /api/v1/inventory/locations
	router.get('api/v1/inventory/locations', async (_req, env) => {
		const { results } = await env.DB.prepare('SELECT id, name, type FROM location ORDER BY id').all();
		return jsonResponse(results);
	});
}
