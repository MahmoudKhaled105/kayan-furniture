import { Router } from '../router';
import { jsonResponse, errorResponse, roundMoney, today } from '../utils';

export function registerFinanceRoutes(router: Router) {
	// GET /api/v1/finance/daily
	router.get('api/v1/finance/daily', async (_req, env, _params, query) => {
		const date = query.date || today();

		const { results: txRows } = await env.DB.prepare(`
			SELECT t.*, l.name AS location_name
			FROM transaction_log t
			LEFT JOIN location l ON l.id = t.location_id
			WHERE t.transaction_date = ?
			ORDER BY t.id
		`).bind(date).all();

		const inflows: any[] = [];
		const outflows: any[] = [];
		let totalIn = 0;
		let totalOut = 0;

		for (const tx of txRows as any[]) {
			let party = '';

			if (tx.type === 'customer' && tx.source_table === 'ORDER_PAYMENT') {
				const op = await env.DB.prepare(`
					SELECT c.name FROM order_payment op
					JOIN sales_order o ON o.id = op.order_id
					JOIN customer c ON c.id = o.customer_id
					WHERE op.id = ?
				`).bind(tx.source_id).first<any>();
				party = op?.name || 'Unknown customer';
			} else if (tx.type === 'supplier') {
				const si = await env.DB.prepare(`
					SELECT s.name FROM shipment_installment si
					JOIN shipment sh ON sh.id = si.shipment_id
					JOIN supplier s ON s.id = sh.supplier_id
					WHERE si.id = ?
				`).bind(tx.source_id).first<any>();
				party = si?.name || 'Unknown supplier';
			} else if (tx.type === 'payroll' && tx.source_table === 'PERSON_PAYMENT') {
				const pp = await env.DB.prepare(
					'SELECT p.name FROM person_payment pp JOIN person p ON p.id = pp.person_id WHERE pp.id = ?'
				).bind(tx.source_id).first<any>();
				party = pp?.name || 'Unknown person';
			} else if (tx.type === 'transport' && tx.source_table === 'ITEM_TRANSFER') {
				const tr = await env.DB.prepare(
					'SELECT p.name FROM item_transfer it LEFT JOIN person p ON p.id = it.transporter_id WHERE it.id = ?'
				).bind(tx.source_id).first<any>();
				party = tr?.name || 'Transport';
			} else if (tx.type === 'expense') {
				party = tx.notes || 'Expense';
			}

			const entry: any = {
				type: tx.type,
				party,
				amount: roundMoney(tx.amount),
				source_id: tx.source_id,
			};
			if (tx.location_name) entry.location = tx.location_name;

			if (tx.direction === 'inflow') {
				totalIn += tx.amount;
				inflows.push(entry);
			} else {
				totalOut += tx.amount;
				outflows.push(entry);
			}
		}

		return jsonResponse({
			date,
			total_in: roundMoney(totalIn),
			total_out: roundMoney(totalOut),
			net: roundMoney(totalIn - totalOut),
			inflows,
			outflows,
		});
	});

	// GET /api/v1/finance/monthly
	router.get('api/v1/finance/monthly', async (_req, env, _params, query) => {
		if (!query.year || !query.month) {
			return errorResponse('validation_error', 'year and month are required', 400);
		}

		const year = parseInt(query.year);
		const month = parseInt(query.month);
		const monthStr = `${year}-${String(month).padStart(2, '0')}`;
		const dateFrom = `${monthStr}-01`;
		const dateTo = `${monthStr}-31`;

		// Total in/out
		const totals = await env.DB.prepare(`
			SELECT direction, SUM(amount) AS total
			FROM transaction_log
			WHERE transaction_date >= ? AND transaction_date <= ?
			GROUP BY direction
		`).bind(dateFrom, dateTo).all();

		let totalIn = 0, totalOut = 0;
		for (const row of totals.results as any[]) {
			if (row.direction === 'inflow') totalIn = row.total;
			else totalOut = row.total;
		}

		// Revenue by location
		const { results: revByLoc } = await env.DB.prepare(`
			SELECT l.name AS location, SUM(t.amount) AS amount
			FROM transaction_log t
			JOIN location l ON l.id = t.location_id
			WHERE t.direction = 'inflow' AND t.transaction_date >= ? AND t.transaction_date <= ?
			GROUP BY t.location_id
		`).bind(dateFrom, dateTo).all();

		// Costs by type
		const { results: costsByType } = await env.DB.prepare(`
			SELECT type, SUM(amount) AS amount
			FROM transaction_log
			WHERE direction = 'outflow' AND transaction_date >= ? AND transaction_date <= ?
			GROUP BY type
		`).bind(dateFrom, dateTo).all();

		// Daily breakdown
		const { results: daily } = await env.DB.prepare(`
			SELECT transaction_date AS date,
				   SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END) AS "in",
				   SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END) AS "out",
				   SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END) -
				   SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END) AS net
			FROM transaction_log
			WHERE transaction_date >= ? AND transaction_date <= ?
			GROUP BY transaction_date
			ORDER BY transaction_date
		`).bind(dateFrom, dateTo).all();

		return jsonResponse({
			year, month,
			total_in: roundMoney(totalIn),
			total_out: roundMoney(totalOut),
			net: roundMoney(totalIn - totalOut),
			revenue_by_location: revByLoc,
			costs_by_type: costsByType,
			daily,
		});
	});

	// GET /api/v1/finance/obligations
	router.get('api/v1/finance/obligations', async (_req, env) => {
		const todayStr = today();

		// Unpaid supplier installments
		const { results: supplierInst } = await env.DB.prepare(`
			SELECT si.shipment_id, s.name AS supplier, si.amount, si.due_date,
				   CASE WHEN si.due_date < ? THEN 1 ELSE 0 END AS overdue
			FROM shipment_installment si
			JOIN shipment sh ON sh.id = si.shipment_id
			JOIN supplier s ON s.id = sh.supplier_id
			WHERE si.is_paid = 0
			ORDER BY si.due_date
		`).bind(todayStr).all();

		const totalOwedSuppliers = (supplierInst as any[]).reduce((s, r) => s + r.amount, 0);

		// Staff outstanding balances
		const { results: staffBalances } = await env.DB.prepare(`
			SELECT p.id AS person_id, p.name,
				   COALESCE(w.earned, 0) - COALESCE(pp.paid, 0) AS outstanding
			FROM person p
			LEFT JOIN (SELECT person_id, SUM(amount_earned) AS earned FROM work_log GROUP BY person_id) w ON w.person_id = p.id
			LEFT JOIN (SELECT person_id, SUM(amount) AS paid FROM person_payment GROUP BY person_id) pp ON pp.person_id = p.id
			WHERE COALESCE(w.earned, 0) - COALESCE(pp.paid, 0) > 0
			ORDER BY outstanding DESC
		`).all();

		const totalOwedStaff = (staffBalances as any[]).reduce((s, r) => s + r.outstanding, 0);

		// Customer outstanding balances
		const { results: customerBalances } = await env.DB.prepare(`
			SELECT o.id AS order_id, c.name AS customer,
				   o.agreed_price - COALESCE(p.paid, 0) AS outstanding,
				   0 AS overdue
			FROM sales_order o
			JOIN customer c ON c.id = o.customer_id
			LEFT JOIN (SELECT order_id, SUM(amount) AS paid FROM order_payment GROUP BY order_id) p ON p.order_id = o.id
			WHERE o.status NOT IN ('cancelled') AND o.agreed_price - COALESCE(p.paid, 0) > 0
			ORDER BY outstanding DESC
		`).all();

		const totalOwedByCustomers = (customerBalances as any[]).reduce((s, r) => s + r.outstanding, 0);

		return jsonResponse({
			total_owed_to_suppliers: roundMoney(totalOwedSuppliers),
			total_owed_to_staff: roundMoney(totalOwedStaff),
			total_owed_by_customers: roundMoney(totalOwedByCustomers),
			supplier_installments: supplierInst,
			staff_balances: staffBalances,
			customer_balances: customerBalances,
		});
	});

	// GET /api/v1/finance/transactions
	router.get('api/v1/finance/transactions', async (_req, env, _params, query) => {
		const page = parseInt(query.page || '1');
		const perPage = Math.min(parseInt(query.per_page || '50'), 200);
		const offset = (page - 1) * perPage;

		let whereSql = '';
		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.type) {
			conditions.push('t.type = ?');
			bindings.push(query.type);
		}
		if (query.direction) {
			conditions.push('t.direction = ?');
			bindings.push(query.direction);
		}
		if (query.location_id) {
			conditions.push('t.location_id = ?');
			bindings.push(parseInt(query.location_id));
		}
		if (query.date_from) {
			conditions.push('t.transaction_date >= ?');
			bindings.push(query.date_from);
		}
		if (query.date_to) {
			conditions.push('t.transaction_date <= ?');
			bindings.push(query.date_to);
		}
		if (query.search) {
			conditions.push('t.notes LIKE ?');
			bindings.push(`%${query.search}%`);
		}

		if (conditions.length > 0) whereSql = ' WHERE ' + conditions.join(' AND ');

		// Count
		const countStmt = env.DB.prepare(`SELECT COUNT(*) AS cnt FROM transaction_log t${whereSql}`);
		const countResult = bindings.length > 0 ? await countStmt.bind(...bindings).first<any>() : await countStmt.first<any>();
		const totalCount = countResult?.cnt || 0;

		// Fetch
		const dataSql = `
			SELECT t.*, l.name AS location_name
			FROM transaction_log t
			LEFT JOIN location l ON l.id = t.location_id
			${whereSql}
			ORDER BY t.transaction_date DESC, t.id DESC
			LIMIT ? OFFSET ?
		`;

		const dataBindings = [...bindings, perPage, offset];
		const { results: items } = await env.DB.prepare(dataSql).bind(...dataBindings).all();

		return jsonResponse({
			total_count: totalCount,
			page,
			per_page: perPage,
			items,
		});
	});

	// GET /api/v1/finance/by-gallery
	router.get('api/v1/finance/by-gallery', async (_req, env, _params, query) => {
		if (!query.location_id || !query.date_from || !query.date_to) {
			return errorResponse('validation_error', 'location_id, date_from, and date_to are required', 400);
		}

		const locId = parseInt(query.location_id);
		const loc = await env.DB.prepare("SELECT id, name, type FROM location WHERE id = ? AND type = 'gallery'")
			.bind(locId).first<any>();
		if (!loc) return errorResponse('validation_error', 'location_id must refer to a gallery', 400);

		// Revenue (inflows)
		const rev = await env.DB.prepare(`
			SELECT COALESCE(SUM(amount), 0) AS total
			FROM transaction_log
			WHERE direction = 'inflow' AND location_id = ? AND transaction_date >= ? AND transaction_date <= ?
		`).bind(locId, query.date_from, query.date_to).first<any>();

		// Costs by type
		const { results: costRows } = await env.DB.prepare(`
			SELECT type, SUM(amount) AS amount
			FROM transaction_log
			WHERE direction = 'outflow' AND location_id = ? AND transaction_date >= ? AND transaction_date <= ?
			GROUP BY type
		`).bind(locId, query.date_from, query.date_to).all();

		const costs: any = { total: 0 };
		for (const row of costRows as any[]) {
			costs[row.type] = roundMoney(row.amount);
			costs.total += row.amount;
		}
		costs.total = roundMoney(costs.total);

		// Stock value at this location
		const stockVal = await env.DB.prepare(`
			SELECT COALESCE(SUM(purchase_value), 0) AS value
			FROM item WHERE location_id = ? AND status != 'sold'
		`).bind(locId).first<any>();

		const revenue = roundMoney(rev?.total || 0);

		return jsonResponse({
			location_id: locId,
			location_name: loc.name,
			period: { from: query.date_from, to: query.date_to },
			revenue,
			costs,
			net: roundMoney(revenue - costs.total),
			stock_value: roundMoney(stockVal?.value || 0),
		});
	});
}
