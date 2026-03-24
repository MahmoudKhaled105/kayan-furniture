import { Router } from '../router';
import { jsonResponse, errorResponse, parseId, readBody, roundMoney } from '../utils';

export function registerPeopleRoutes(router: Router) {
	// GET /api/v1/people
	router.get('api/v1/people', async (_req, env) => {
		const { results } = await env.DB.prepare(`
			SELECT p.*, GROUP_CONCAT(pl.location_id) AS location_ids_csv
			FROM person p
			LEFT JOIN person_location pl ON pl.person_id = p.id
			GROUP BY p.id
			ORDER BY p.id
		`).all();

		const data = (results as any[]).map(r => ({
			...r,
			location_ids: r.location_ids_csv ? r.location_ids_csv.split(',').map(Number) : [],
			location_ids_csv: undefined,
		}));

		return jsonResponse(data);
	});

	// POST /api/v1/people
	router.post('api/v1/people', async (req, env) => {
		const body = await readBody(req) as any;

		if (!body.name) return errorResponse('validation_error', 'name is required', 400);
		if (!body.role) return errorResponse('validation_error', 'role is required', 400);
		if (!body.employment_type) return errorResponse('validation_error', 'employment_type is required', 400);
		if (!body.payment_type) return errorResponse('validation_error', 'payment_type is required', 400);
		if (body.rate == null) return errorResponse('validation_error', 'rate is required', 400);
		if (!Array.isArray(body.location_ids) || body.location_ids.length === 0) {
			return errorResponse('validation_error', 'location_ids is required (non-empty array)', 400);
		}

		if (body.employment_type === 'temporary' && !body.contract_start) {
			return errorResponse('unprocessable', 'contract_start is required when employment_type is temporary', 422);
		}

		const result = await env.DB.prepare(`
			INSERT INTO person (name, role, phone, employment_type, payment_type, rate, contract_start, contract_end, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`).bind(
			body.name, body.role, body.phone || null,
			body.employment_type, body.payment_type, body.rate,
			body.contract_start || null, body.contract_end || null
		).run();

		const personId = result.meta.last_row_id;

		// Insert person_location entries
		for (const locId of body.location_ids) {
			await env.DB.prepare(
				'INSERT INTO person_location (person_id, location_id) VALUES (?, ?)'
			).bind(personId, locId).run();
		}

		const person = await env.DB.prepare('SELECT * FROM person WHERE id = ?').bind(personId).first();
		return jsonResponse({ ...person, location_ids: body.location_ids }, 201);
	});

	// GET /api/v1/people/:id
	router.get('api/v1/people/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const person = await env.DB.prepare('SELECT * FROM person WHERE id = ?').bind(id).first();
		if (!person) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const { results: locs } = await env.DB.prepare(
			'SELECT location_id FROM person_location WHERE person_id = ?'
		).bind(id).all();

		return jsonResponse({ ...person, location_ids: locs.map((l: any) => l.location_id) });
	});

	// PATCH /api/v1/people/:id
	router.patch('api/v1/people/:id', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const existing = await env.DB.prepare('SELECT * FROM person WHERE id = ?').bind(id).first();
		if (!existing) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		const fields: string[] = [];
		const values: unknown[] = [];
		const allowed = ['name', 'role', 'phone', 'employment_type', 'payment_type', 'rate', 'contract_start', 'contract_end', 'status'];

		for (const key of allowed) {
			if (key in body) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}

		if (fields.length > 0) {
			values.push(id);
			await env.DB.prepare(`UPDATE person SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		}

		// Update location_ids if provided
		if (Array.isArray(body.location_ids)) {
			await env.DB.prepare('DELETE FROM person_location WHERE person_id = ?').bind(id).run();
			for (const locId of body.location_ids) {
				await env.DB.prepare(
					'INSERT INTO person_location (person_id, location_id) VALUES (?, ?)'
				).bind(id, locId).run();
			}
		}

		const updated = await env.DB.prepare('SELECT * FROM person WHERE id = ?').bind(id).first();
		const { results: locs } = await env.DB.prepare(
			'SELECT location_id FROM person_location WHERE person_id = ?'
		).bind(id).all();

		return jsonResponse({ ...updated, location_ids: locs.map((l: any) => l.location_id) });
	});

	// GET /api/v1/people/:id/work-log
	router.get('api/v1/people/:id/work-log', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const person = await env.DB.prepare('SELECT id FROM person WHERE id = ?').bind(id).first();
		if (!person) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(
			'SELECT * FROM work_log WHERE person_id = ? ORDER BY log_date DESC'
		).bind(id).all();
		return jsonResponse(results);
	});

	// POST /api/v1/people/:id/work-log
	router.post('api/v1/people/:id/work-log', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const person = await env.DB.prepare('SELECT * FROM person WHERE id = ?').bind(id).first<any>();
		if (!person) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		if (!body.log_date) return errorResponse('validation_error', 'log_date is required', 400);
		if (!body.log_type) return errorResponse('validation_error', 'log_type is required', 400);
		if (!body.location_id) return errorResponse('validation_error', 'location_id is required', 400);
		if (body.quantity == null) return errorResponse('validation_error', 'quantity is required', 400);

		const amountEarned = roundMoney(person.rate * body.quantity);

		const result = await env.DB.prepare(`
			INSERT INTO work_log (person_id, location_id, log_date, log_type, quantity, amount_earned, transfer_id, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			id, body.location_id, body.log_date, body.log_type,
			body.quantity, amountEarned, body.transfer_id || null, body.notes || null
		).run();

		const entry = await env.DB.prepare('SELECT * FROM work_log WHERE id = ?')
			.bind(result.meta.last_row_id).first();
		return jsonResponse(entry, 201);
	});

	// GET /api/v1/people/:id/payments
	router.get('api/v1/people/:id/payments', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const person = await env.DB.prepare('SELECT id FROM person WHERE id = ?').bind(id).first();
		if (!person) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(
			'SELECT * FROM person_payment WHERE person_id = ? ORDER BY payment_date DESC'
		).bind(id).all();
		return jsonResponse(results);
	});

	// POST /api/v1/people/:id/payments
	router.post('api/v1/people/:id/payments', async (req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid person ID', 400);

		const person = await env.DB.prepare('SELECT id FROM person WHERE id = ?').bind(id).first();
		if (!person) return errorResponse('not_found', `Person with id ${id} was not found.`, 404);

		const body = await readBody(req) as any;
		if (!body.amount) return errorResponse('validation_error', 'amount is required', 400);
		if (!body.payment_date) return errorResponse('validation_error', 'payment_date is required', 400);
		if (!body.method) return errorResponse('validation_error', 'method is required', 400);

		const result = await env.DB.prepare(
			'INSERT INTO person_payment (person_id, amount, payment_date, method, notes) VALUES (?, ?, ?, ?, ?)'
		).bind(id, body.amount, body.payment_date, body.method, body.notes || null).run();

		// Create transaction_log outflow
		await env.DB.prepare(`
			INSERT INTO transaction_log (transaction_date, type, direction, amount, source_table, source_id, notes)
			VALUES (?, 'payroll', 'outflow', ?, 'PERSON_PAYMENT', ?, ?)
		`).bind(body.payment_date, body.amount, result.meta.last_row_id, body.notes || null).run();

		// Compute outstanding balance
		const earned = await env.DB.prepare(
			'SELECT COALESCE(SUM(amount_earned), 0) AS total FROM work_log WHERE person_id = ?'
		).bind(id).first<any>();
		const paid = await env.DB.prepare(
			'SELECT COALESCE(SUM(amount), 0) AS total FROM person_payment WHERE person_id = ?'
		).bind(id).first<any>();

		const outstanding = roundMoney((earned?.total || 0) - (paid?.total || 0));

		return jsonResponse({
			id: result.meta.last_row_id,
			person_id: id,
			amount: body.amount,
			payment_date: body.payment_date,
			method: body.method,
			outstanding_balance_after: outstanding,
		}, 201);
	});

	// GET /api/v1/payroll/summary
	router.get('api/v1/payroll/summary', async (_req, env, _params, query) => {
		if (!query.date_from || !query.date_to) {
			return errorResponse('validation_error', 'date_from and date_to are required', 400);
		}

		let earnedSql = `
			SELECT w.person_id, p.name, p.role,
				   SUM(w.amount_earned) AS earned
			FROM work_log w
			JOIN person p ON p.id = w.person_id
			WHERE w.log_date >= ? AND w.log_date <= ?
		`;
		const earnedBindings: unknown[] = [query.date_from, query.date_to];

		if (query.location_id) {
			earnedSql += ' AND w.location_id = ?';
			earnedBindings.push(parseInt(query.location_id));
		}
		if (query.role) {
			earnedSql += ' AND p.role = ?';
			earnedBindings.push(query.role);
		}
		earnedSql += ' GROUP BY w.person_id';

		const { results: earnedRows } = await env.DB.prepare(earnedSql).bind(...earnedBindings).all();

		// Get payments in period
		let paidSql = `
			SELECT pp.person_id, SUM(pp.amount) AS paid
			FROM person_payment pp
			JOIN person p ON p.id = pp.person_id
			WHERE pp.payment_date >= ? AND pp.payment_date <= ?
		`;
		const paidBindings: unknown[] = [query.date_from, query.date_to];

		if (query.role) {
			paidSql += ' AND p.role = ?';
			paidBindings.push(query.role);
		}
		paidSql += ' GROUP BY pp.person_id';

		const { results: paidRows } = await env.DB.prepare(paidSql).bind(...paidBindings).all();
		const paidMap = new Map((paidRows as any[]).map(r => [r.person_id, r.paid]));

		let totalEarned = 0;
		let totalPaid = 0;
		const personIds = new Set<number>();

		const byPerson = (earnedRows as any[]).map(r => {
			const paid = paidMap.get(r.person_id) || 0;
			totalEarned += r.earned;
			totalPaid += paid;
			personIds.add(r.person_id);
			return {
				person_id: r.person_id,
				name: r.name,
				role: r.role,
				earned: roundMoney(r.earned),
				paid: roundMoney(paid),
				outstanding: roundMoney(r.earned - paid),
			};
		});

		// Include people who received payment but had no work logged
		for (const row of paidRows as any[]) {
			if (!personIds.has(row.person_id)) {
				totalPaid += row.paid;
				personIds.add(row.person_id);
			}
		}

		return jsonResponse({
			period: { from: query.date_from, to: query.date_to },
			total_earned: roundMoney(totalEarned),
			total_paid: roundMoney(totalPaid),
			total_outstanding: roundMoney(totalEarned - totalPaid),
			headcount: personIds.size,
			by_person: byPerson,
		});
	});
}
