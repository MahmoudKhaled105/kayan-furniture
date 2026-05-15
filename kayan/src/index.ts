import { Router } from './router';
import { registerLocationRoutes } from './routes/locations';
import { registerSupplierRoutes } from './routes/suppliers';
import { registerShipmentRoutes } from './routes/shipments';
import { registerItemRoutes } from './routes/items';
import { registerCustomerRoutes } from './routes/customers';
import { registerOrderRoutes } from './routes/orders';
import { registerPeopleRoutes } from './routes/people';
import { registerExpenseRoutes } from './routes/expenses';
import { registerFinanceRoutes } from './routes/finance';
import { registerAuthRoutes } from './routes/auth';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerInventoryRoutes } from './routes/inventory';
import { registerUploadRoutes } from './routes/upload';

const router = new Router();

// Register all route modules
router.get('/', async () => {
	return Response.json({
		name: 'Kayan Furniture Gallery API',
		version: '1.0',
		status: 'running',
		base_url: '/api/v1',
	});
});

registerLocationRoutes(router);
registerSupplierRoutes(router);
registerShipmentRoutes(router);
registerItemRoutes(router);
registerCustomerRoutes(router);
registerOrderRoutes(router);
registerPeopleRoutes(router);
registerExpenseRoutes(router);
registerFinanceRoutes(router);
registerAuthRoutes(router);
registerDashboardRoutes(router);
registerInventoryRoutes(router);
registerUploadRoutes(router);


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		const response = await router.handle(request, env);

		// Add CORS headers to all responses
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

		return response;
	},
} satisfies ExportedHandler<Env>;
