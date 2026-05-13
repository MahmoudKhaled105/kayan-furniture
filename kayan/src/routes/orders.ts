import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, today } from '../utils';

export function registerOrderRoutes(router: Router) {
	// GET /api/v1/orders
	router.get('api/v1/orders', async (_req, env) => {
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
			ORDER BY o.order_date DESC
		`).all();
		return jsonResponse(results);
	});

	// POST /api/v1/orders
	router.post('api/v1/orders', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.customer_id) return errorResponse('validation_error', 'customer_id is required', 400);
		if (!body.location_id) return errorResponse('validation_error', 'location_id is required', 400);
		if (body.agreed_price == null) return errorResponse('validation_error', 'agreed_price is required', 400);

		// Validate customer
		const customer = await env.DB.prepare('SELECT id FROM customer WHERE id = ?').bind(body.customer_id).first();
		if (!customer) return errorResponse('not_found', `Customer with id ${body.customer_id} was not found.`, 404);

		// Validate location
		const loc = await env.DB.prepare('SELECT id FROM location WHERE id = ?').bind(body.location_id).first();
		if (!loc) return errorResponse('not_found', `Location with id ${body.location_id} was not found.`, 404);

		const isBackorder = body.is_backorder === true;

		if (isBackorder && (!body.backorder_description || body.backorder_description.trim() === '')) {
			return errorResponse('validation_error', 'backorder_description is required when is_backorder is true', 400);
		}

		// Validate item if provided
		if (body.item_id) {
			const item = await env.DB.prepare('SELECT id, status FROM item WHERE id = ?').bind(body.item_id).first<any>();
			if (!item) return errorResponse('not_found', `Item with id ${body.item_id} was not found.`, 404);
			if (item.status === 'reserved' || item.status === 'sold') {
				return errorResponse('conflict', 'Item is already reserved or sold.', 409);
			}
		}

		let status = isBackorder ? 'backorder' : 'active';
		const orderDate = today();

		if (!isBackorder && body.initial_payment >= body.agreed_price) {
			status = 'fulfilled';
		}

		const result = await env.DB.prepare(`
			INSERT INTO sales_order (customer_id, item_id, location_id, agreed_price, status, is_backorder, backorder_description, expected_arrival, fulfillment_trigger, order_date)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			body.customer_id,
			body.item_id || null,
			body.location_id,
			body.agreed_price,
			status,
			isBackorder ? 1 : 0,
			body.backorder_description || null,
			body.expected_arrival || null,
			body.fulfillment_trigger || null,
			orderDate
		).run();

		const orderId = result.meta.last_row_id;

		// Set item to reserved (or sold if fulfilled) if provided
		if (body.item_id) {
			const itemStatus = status === 'fulfilled' ? 'sold' : 'reserved';
			await env.DB.prepare('UPDATE item SET status = ? WHERE id = ?').bind(itemStatus, body.item_id).run();
		}

		// Create initial payment if > 0
		let totalPaid = 0;
		if (body.initial_payment && body.initial_payment > 0) {
			await env.DB.prepare(
				'INSERT INTO order_payment (order_id, amount, payment_date) VALUES (?, ?, ?)'
			).bind(orderId, body.initial_payment, orderDate).run();

			totalPaid = body.initial_payment;

			// Create transaction_log inflow
			await env.DB.prepare(`
				INSERT INTO transaction_log (transaction_date, type, direction, amount, location_id, source_table, source_id)
				VALUES (?, 'customer', 'inflow', ?, ?, 'ORDER_PAYMENT', ?)
			`).bind(orderDate, body.initial_payment, body.location_id, orderId).run();
		}

		const order = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			WHERE o.id = ?
		`).bind(orderId).first();

		return jsonResponse({
			...order,
			total_paid: totalPaid,
			remaining_balance: body.agreed_price - totalPaid,
		}, 201);
	});

	// GET /api/v1/orders/:id
	router.get('api/v1/orders/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid order ID', 400);

		const order = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name,
				   COALESCE(p.total_paid, 0) AS total_paid,
				   o.agreed_price - COALESCE(p.total_paid, 0) AS remaining_balance
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			LEFT JOIN (
				SELECT order_id, SUM(amount) AS total_paid FROM order_payment GROUP BY order_id
			) p ON p.order_id = o.id
			WHERE o.id = ?
		`).bind(id).first();

		if (!order) return errorResponse('not_found', `Order with id ${id} was not found.`, 404);
		return jsonResponse(order);
	});

	// PATCH /api/v1/orders/:id
	router.patch('api/v1/orders/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid order ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM sales_order WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Order with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['status', 'agreed_price', 'backorder_description', 'expected_arrival', 'fulfillment_trigger'];

		for (const key of allowed) {
			if (key in body) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length > 0) {
			values.push(id);
			await env.DB.prepare(`UPDATE sales_order SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		const updated = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			WHERE o.id = ?
		`).bind(id).first();
		return jsonResponse(updated);
	});

	// POST /api/v1/orders/:id/payments
	router.post('api/v1/orders/:id/payments', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid order ID', 400);

		const order = await env.DB.prepare('SELECT * FROM sales_order WHERE id = ?').bind(id).first<any>();
		if (!order) return errorResponse('not_found', `Order with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		if (!body.amount) return errorResponse('validation_error', 'amount is required', 400);
		if (!body.payment_date) return errorResponse('validation_error', 'payment_date is required', 400);

		const payResult = await env.DB.prepare(
			'INSERT INTO order_payment (order_id, amount, payment_date, notes) VALUES (?, ?, ?, ?)'
		).bind(id, body.amount, body.payment_date, body.notes || null).run();

		// Create transaction_log inflow
		await env.DB.prepare(`
			INSERT INTO transaction_log (transaction_date, type, direction, amount, location_id, source_table, source_id)
			VALUES (?, 'customer', 'inflow', ?, ?, 'ORDER_PAYMENT', ?)
		`).bind(body.payment_date, body.amount, order.location_id, payResult.meta.last_row_id).run();

		// Get running total
		const totals = await env.DB.prepare(
			'SELECT SUM(amount) AS running_total_paid FROM order_payment WHERE order_id = ?'
		).bind(id).first<any>();

		const runningTotalPaid = totals?.running_total_paid || 0;
		const remainingBalance = order.agreed_price - runningTotalPaid;

		// Auto-fulfill if paid in full and currently active
		let currentStatus = order.status;
		if (runningTotalPaid >= order.agreed_price && order.status === 'active') {
			await env.DB.prepare('UPDATE sales_order SET status = ? WHERE id = ?').bind('fulfilled', id).run();
			currentStatus = 'fulfilled';

			if (order.item_id) {
				await env.DB.prepare('UPDATE item SET status = ? WHERE id = ?').bind('sold', order.item_id).run();
			}
		}

		return jsonResponse({
			id: payResult.meta.last_row_id,
			order_id: id,
			amount: body.amount,
			payment_date: body.payment_date,
			running_total_paid: Math.round(runningTotalPaid * 100) / 100,
			remaining_balance: Math.round(remainingBalance * 100) / 100,
			status: currentStatus,
		}, 201);
	});

	// GET /api/v1/orders/:id/payments
	router.get('api/v1/orders/:id/payments', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid order ID', 400);

		const order = await env.DB.prepare('SELECT id FROM sales_order WHERE id = ?').bind(id).first();
		if (!order) return errorResponse('not_found', `Order with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(
			'SELECT * FROM order_payment WHERE order_id = ? ORDER BY payment_date'
		).bind(id).all();
		return jsonResponse(results);
	});

	// POST /api/v1/orders/:id/fulfill
	router.post('api/v1/orders/:id/fulfill', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid order ID', 400);

		const order = await env.DB.prepare('SELECT * FROM sales_order WHERE id = ?').bind(id).first<any>();
		if (!order) return errorResponse('not_found', `Order with id ${id} was not found.`, 404);

		if (!order.is_backorder) {
			return errorResponse('validation_error', 'Order is not a backorder.', 400);
		}
		if (order.status === 'fulfilled') {
			return errorResponse('validation_error', 'Order is already fulfilled.', 400);
		}

		const body = await readBody(req) as any;
		if (!body.item_id) return errorResponse('validation_error', 'item_id is required', 400);

		const item = await env.DB.prepare('SELECT id, status FROM item WHERE id = ?').bind(body.item_id).first<any>();
		if (!item) return errorResponse('not_found', `Item with id ${body.item_id} was not found.`, 404);

		if (item.status === 'reserved' || item.status === 'sold') {
			return errorResponse('conflict', 'Item is already reserved or sold.', 409);
		}

		// Update order
		await env.DB.prepare('UPDATE sales_order SET status = ?, item_id = ? WHERE id = ?')
			.bind('fulfilled', body.item_id, id).run();

		// Update item
		await env.DB.prepare('UPDATE item SET status = ? WHERE id = ?').bind('reserved', body.item_id).run();

		const updated = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			WHERE o.id = ?
		`).bind(id).first();
		return jsonResponse(updated);
	});

	// GET /api/v1/orders/backorders
	router.get('api/v1/orders/backorders', async (_req, env) => {
		const { results } = await env.DB.prepare(`
			SELECT o.*, c.name AS customer_name, l.name AS location_name
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			JOIN location l ON l.id = o.location_id
			WHERE o.is_backorder = 1 AND o.status = 'backorder'
			ORDER BY o.expected_arrival, o.order_date
		`).all();
		return jsonResponse(results);
	});
}
