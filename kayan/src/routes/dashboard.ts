import { Router } from '../router';
import { jsonResponse, roundMoney, today } from '../utils';
import { roleMiddleware } from '../middleware/auth';

/**
 * Register Dashboard routes for financial oversight and statistics
 */
export function registerDashboardRoutes(router: Router) {
	// GET /api/v1/dashboard/overview
	// Financial overview: total in, out, profit, recent transactions
	router.get('api/v1/dashboard/overview', roleMiddleware(['admin'], async (req, env) => {
		const inflow = await env.DB.prepare(
			"SELECT SUM(amount) AS total FROM transaction_log WHERE direction = 'inflow'"
		).first<any>();
		
		const outflow = await env.DB.prepare(
			"SELECT SUM(amount) AS total FROM transaction_log WHERE direction = 'outflow'"
		).first<any>();

		const totalInValue = inflow?.total || 0;
		const totalOutValue = outflow?.total || 0;

		const { results: recent } = await env.DB.prepare(`
			SELECT t.*, l.name AS location_name
			FROM transaction_log t
			LEFT JOIN location l ON l.id = t.location_id
			ORDER BY t.transaction_date DESC, t.id DESC
			LIMIT 10
		`).all();

		return jsonResponse({
			total_in: roundMoney(totalInValue),
			total_out: roundMoney(totalOutValue),
			net_profit: roundMoney(totalInValue - totalOutValue),
			recent_transactions: recent
		});
	}));

	// GET /api/v1/dashboard/expenses
	// Grouped expenses by category for a selected period
	router.get('api/v1/dashboard/expenses', roleMiddleware(['admin'], async (req, env, params, query) => {
		const dateFrom = query.date_from || '1970-01-01';
		const dateTo = query.date_to || today();

		const { results } = await env.DB.prepare(`
			SELECT category, SUM(amount) AS total 
			FROM expense 
			WHERE expense_date >= ? AND expense_date <= ?
			GROUP BY category
			ORDER BY total DESC
		`).bind(dateFrom, dateTo).all();

		return jsonResponse({
			period: { from: dateFrom, to: dateTo },
			categories: results
		});
	}));

	// GET /api/v1/dashboard/stats
	// Monthly target progress and other statistics
	router.get('api/v1/dashboard/stats', roleMiddleware(['admin'], async (req, env) => {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
		
		const monthInflow = await env.DB.prepare(
			"SELECT SUM(amount) AS total FROM transaction_log WHERE direction = 'inflow' AND transaction_date >= ?"
		).bind(monthStart).first<any>();

		const { results: typeStats } = await env.DB.prepare(`
			SELECT type, SUM(amount) AS total 
			FROM transaction_log 
			GROUP BY type
			ORDER BY total DESC
		`).all();

		return jsonResponse({
			current_month_inflow: roundMoney(monthInflow?.total || 0),
			monthly_target: 50000, 
			category_distribution: typeStats
		});
	}));
}
