import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody } from '../utils';

export function registerCustomerRoutes(router: Router) {
	// GET /api/v1/customers
	router.get('api/v1/customers', async (_req, env) => {
		const { results } = await env.DB.prepare('SELECT * FROM customer ORDER BY id').all();
		return jsonResponse(results);
	});

	// POST /api/v1/customers
	router.post('api/v1/customers', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return errorResponse('validation_error', 'name is required', 400);
		}

		const result = await env.DB.prepare(
			'INSERT INTO customer (name, phone, notes) VALUES (?, ?, ?)'
		).bind(body.name.trim(), body.phone || null, body.notes || null).run();

		const customer = await env.DB.prepare('SELECT * FROM customer WHERE id = ?')
			.bind(result.meta.last_row_id).first();
		return jsonResponse(customer, 201);
	});

	// GET /api/v1/customers/:id
	router.get('api/v1/customers/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid customer ID', 400);

		const customer = await env.DB.prepare('SELECT * FROM customer WHERE id = ?').bind(id).first();
		if (!customer) return errorResponse('not_found', `Customer with id ${id} was not found.`, 404);
		return jsonResponse(customer);
	});

	// PATCH /api/v1/customers/:id
	router.patch('api/v1/customers/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid customer ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM customer WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Customer with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['name', 'phone', 'notes'];

		for (const key of allowed) {
			if (key in body) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length > 0) {
			values.push(id);
			await env.DB.prepare(`UPDATE customer SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		const updated = await env.DB.prepare('SELECT * FROM customer WHERE id = ?').bind(id).first();
		return jsonResponse(updated);
	});

	// GET /api/v1/customers/:id/orders
	router.get('api/v1/customers/:id/orders', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid customer ID', 400);

		const customer = await env.DB.prepare('SELECT id FROM customer WHERE id = ?').bind(id).first();
		if (!customer) return errorResponse('not_found', `Customer with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name,
				   COALESCE(p.total_paid, 0) AS total_paid,
				   o.agreed_price - COALESCE(p.total_paid, 0) AS remaining_balance
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			LEFT JOIN (
				SELECT order_id, SUM(amount) AS total_paid FROM order_payment GROUP BY order_id
			) p ON p.order_id = o.id
			WHERE o.customer_id = ?
			ORDER BY o.order_date DESC
		`).bind(id).all();

		return jsonResponse(results);
	});
}
