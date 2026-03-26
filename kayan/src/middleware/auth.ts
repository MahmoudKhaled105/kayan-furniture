import { Router, RouteHandler } from '../router';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils';

export interface AuthContext {
	user: {
		id: number;
		email: string;
		role: string;
	};
}

/**
 * Middleware to authenticate requests via JWT Bearer token
 */
export function authMiddleware(handler: RouteHandler): RouteHandler {
	return async (req, env, params, query) => {
		const authHeader = req.headers.get('Authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return errorResponse('unauthorized', 'Missing or invalid authorization header', 401);
		}

		const token = authHeader.split(' ')[1];
		const secret = env.JWT_SECRET || 'dev-secret-key';
		const payload = await verifyToken(token, secret);

		if (!payload) {
			return errorResponse('unauthorized', 'Invalid or expired token', 401);
		}

		// Attach user info to the request for the handler to use
		// Note: Since we can't easily modify the Request object in Cloudflare Workers without cloning,
		// we'll pass the auth context via a custom header or just rely on the fact that 
		// the handler can re-verify if needed, but a better way is to pass it through a custom property 
		// if the router supports it. Our router doesn't support custom props in Request easily, 
		// but we can pass it as a special param or just rely on the handler to trust the verification.
		
		// Let's modify the handler to accept an optional user object or just use as is.
		// For now, we'll just proceed and assume the handler is okay.
		
		return handler(req, env, { ...params, auth_user: JSON.stringify(payload) }, query);
	};
}

/**
 * Middleware to check for specific roles
 */
export function roleMiddleware(roles: string[], handler: RouteHandler): RouteHandler {
	return authMiddleware(async (req, env, params, query) => {
		const userStr = params.auth_user;
		if (!userStr) return errorResponse('unauthorized', 'Not authenticated', 401);
		
		const user = JSON.parse(userStr);
		if (!roles.includes(user.role)) {
			return errorResponse('forbidden', 'You do not have permission to access this resource', 403);
		}
		
		return handler(req, env, params, query);
	});
}
