import { Router } from '../router';
import { jsonResponse, errorResponse, readBody } from '../utils';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

export function registerAuthRoutes(router: Router) {
	// POST /api/v1/auth/register
	router.post('api/v1/auth/register', async (req, env) => {
		const { email, password, name } = await readBody<{ email?: string; password?: string; name?: string }>(req);

		if (!email || !password || !name) {
			return errorResponse('validation_error', 'Email, password, and name are required', 400);
		}

		// Check if user already exists
		const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
		if (existingUser) {
			return errorResponse('validation_error', 'User with this email already exists', 400);
		}

		const passwordHash = await hashPassword(password);
		const { success } = await env.DB.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
			.bind(email, passwordHash, name, 'user')
			.run();

		if (!success) {
			return errorResponse('internal_error', 'Failed to create user', 500);
		}

		const user = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?').bind(email).first<any>();

		return jsonResponse({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		});
	});

	// POST /api/v1/auth/login
	router.post('api/v1/auth/login', async (req, env) => {
		const { email, password } = await readBody<{ email?: string; password?: string }>(req);

		if (!email || !password) {
			return errorResponse('validation_error', 'Email and password are required', 400);
		}

		const user = await env.DB.prepare('SELECT id, email, name, role, password_hash FROM users WHERE email = ?')
			.bind(email)
			.first<any>();

		if (!user || !(await verifyPassword(password, user.password_hash))) {
			return errorResponse('unauthorized', 'Invalid email or password', 401);
		}

		const secret = env.JWT_SECRET || 'dev-secret-key';
		const accessToken = await generateAccessToken(user.id, user.email, user.role, secret);
		const refreshToken = await generateRefreshToken(user.id, secret);

		// Store refresh token in session table
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
		
		await env.DB.prepare('INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)')
			.bind(user.id, refreshToken, expiresAt.toISOString())
			.run();

		// Update last login
		await env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run();

		return jsonResponse({
			accessToken,
			refreshToken,
			expiresIn: 3600, // 1 hour
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		});
	});

	// POST /api/v1/auth/refresh
	router.post('api/v1/auth/refresh', async (req, env) => {
		const { refreshToken } = await readBody<{ refreshToken?: string }>(req);
		if (!refreshToken) return errorResponse('validation_error', 'Refresh token is required', 400);

		const secret = env.JWT_SECRET || 'dev-secret-key';
		const payload = await verifyToken(refreshToken, secret);

		if (!payload) {
			return errorResponse('unauthorized', 'Invalid or expired refresh token', 401);
		}

		// Check if session exists in DB
		const session = await env.DB.prepare('SELECT user_id FROM user_sessions WHERE refresh_token = ? AND expires_at > CURRENT_TIMESTAMP')
			.bind(refreshToken)
			.first<any>();

		if (!session) {
			return errorResponse('unauthorized', 'Session not found or expired', 401);
		}

		const user = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?').bind(session.user_id).first<any>();
		if (!user) return errorResponse('not_found', 'User not found', 404);

		const accessToken = await generateAccessToken(user.id, user.email, user.role, secret);
		const newRefreshToken = await generateRefreshToken(user.id, secret);

		// Rotate refresh token
		await env.DB.prepare('DELETE FROM user_sessions WHERE refresh_token = ?').bind(refreshToken).run();
		
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30);
		await env.DB.prepare('INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)')
			.bind(user.id, newRefreshToken, expiresAt.toISOString())
			.run();

		return jsonResponse({
			accessToken,
			refreshToken: newRefreshToken,
			expiresIn: 3600,
		});
	});

	// POST /api/v1/auth/logout
	router.post('api/v1/auth/logout', async (req, env) => {
		const { refreshToken } = await readBody<{ refreshToken?: string }>(req);
		if (refreshToken) {
			await env.DB.prepare('DELETE FROM user_sessions WHERE refresh_token = ?').bind(refreshToken).run();
		}
		return jsonResponse({ success: true });
	});

	// GET /api/v1/auth/me
	router.get('api/v1/auth/me', authMiddleware(async (req, env, params) => {
		const userStr = params.auth_user;
		if (!userStr) return errorResponse('unauthorized', 'Not authenticated', 401);
		
		const userPayload = JSON.parse(userStr);
		const user = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?')
			.bind(userPayload.id)
			.first<any>();

		if (!user) return errorResponse('not_found', 'User not found', 404);

		return jsonResponse({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		});
	}));
}
