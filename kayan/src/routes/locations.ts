import { Router } from '../router';
import { jsonResponse, errorResponse, parseId } from '../utils';

export function registerLocationRoutes(router: Router) {
	// GET /api/v1/locations
	router.get('api/v1/locations', async (_req, env) => {
		const { results } = await env.DB.prepare('SELECT id, name, type FROM location ORDER BY id').all();
		return jsonResponse(results);
	});

	// GET /api/v1/locations/:id
	router.get('api/v1/locations/:id', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid location ID', 400);

		const row = await env.DB.prepare('SELECT id, name, type FROM location WHERE id = ?').bind(id).first();
		if (!row) return errorResponse('not_found', `Location with id ${id} was not found.`, 404);
		return jsonResponse(row);
	});

	// GET /api/v1/locations/:id/inventory
	router.get('api/v1/locations/:id/inventory', async (_req, env, params) => {
		const id = parseId(params.id);
		if (!id) return errorResponse('validation_error', 'Invalid location ID', 400);

		const loc = await env.DB.prepare('SELECT id FROM location WHERE id = ?').bind(id).first();
		if (!loc) return errorResponse('not_found', `Location with id ${id} was not found.`, 404);

		const { results } = await env.DB.prepare(`
			SELECT i.id, i.name, i.category, i.status, i.location_id,
				   l.name AS location_name, i.purchase_value, i.sale_price, i.shipment_id
			FROM item i
			JOIN location l ON l.id = i.location_id
			WHERE i.location_id = ?
			ORDER BY i.id
		`).bind(id).all();

		return jsonResponse(results);
	});
}
