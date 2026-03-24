import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, roundMoney } from '../utils';

export function registerExpenseRoutes(router: Router) {
	// GET /api/v1/expenses
	router.get('api/v1/expenses', async (_req, env, _params, query) => {
		let sql = `
			SELECT e.*, l.name AS location_name
			FROM expense e
			LEFT JOIN location l ON l.id = e.location_id
		`;
		const conditions: string[] = [];
		const bindings: unknown[] = [];

		if (query.category) {
			conditions.push('e.category = ?');
			bindings.push(query.category);
		}
		if (query.location_id) {
			conditions.push('e.location_id = ?');
			bindings.push(parseInt(query.location_id));
		}
		if (query.date_from) {
			conditions.push('e.expense_date >= ?');
			bindings.push(query.date_from);
		}
		if (query.date_to) {
			conditions.push('e.expense_date <= ?');
			bindings.push(query.date_to);
		}

		if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
		sql += ' ORDER BY e.expense_date DESC';

		const stmt = env.DB.prepare(sql);
		const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

		const total = (results as any[]).reduce((sum, r) => sum + (r.amount || 0), 0);

		return jsonResponse({
			total: roundMoney(total),
			items: results,
		});
	});

	// POST /api/v1/expenses
	router.post('api/v1/expenses', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.description) return errorResponse('validation_error', 'description is required', 400);
		if (body.amount == null) return errorResponse('validation_error', 'amount is required', 400);
		if (!body.expense_date) return errorResponse('validation_error', 'expense_date is required', 400);
		if (!body.category) return errorResponse('validation_error', 'category is required', 400);

		const isReimbursement = body.paid_by_person_id ? 1 : 0;

		const result = await env.DB.prepare(`
			INSERT INTO expense (description, amount, expense_date, category, location_id, paid_by_person_id, is_reimbursement, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			body.description, body.amount, body.expense_date, body.category,
			body.location_id || null, body.paid_by_person_id || null, isReimbursement, body.notes || null
		).run();

		const expenseId = result.meta.last_row_id;

		// Create transaction_log outflow
		const txResult = await env.DB.prepare(`
			INSERT INTO transaction_log (transaction_date, type, direction, amount, location_id, source_table, source_id, notes)
			VALUES (?, 'expense', 'outflow', ?, ?, 'EXPENSE', ?, ?)
		`).bind(
			body.expense_date, body.amount, body.location_id || null, expenseId, body.description
		).run();

		const expense = await env.DB.prepare(`
			SELECT e.*, l.name AS location_name FROM expense e
			LEFT JOIN location l ON l.id = e.location_id WHERE e.id = ?
		`).bind(expenseId).first();

		return jsonResponse({ ...expense, transaction_log_id: txResult.meta.last_row_id }, 201);
	});

	// GET /api/v1/expenses/:id
	router.get('api/v1/expenses/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid expense ID', 400);

		const expense = await env.DB.prepare(`
			SELECT e.*, l.name AS location_name FROM expense e
			LEFT JOIN location l ON l.id = e.location_id WHERE e.id = ?
		`).bind(id).first();

		if (!expense) return errorResponse('not_found', `Expense with id ${id} was not found.`, 404);
		return jsonResponse(expense);
	});

	// DELETE /api/v1/expenses/:id
	router.delete('api/v1/expenses/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid expense ID', 400);

		const expense = await env.DB.prepare('SELECT id FROM expense WHERE id = ?').bind(id).first();
		if (!expense) return errorResponse('not_found', `Expense with id ${id} was not found.`, 404);

		// Delete related transaction_log entry
		await env.DB.prepare(
			"DELETE FROM transaction_log WHERE source_table = 'EXPENSE' AND source_id = ?"
		).bind(id).run();

		await env.DB.prepare('DELETE FROM expense WHERE id = ?').bind(id).run();

		return jsonResponse({ message: 'Expense deleted' });
	});
}
