import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAccessToken, verifyToken, hashPassword, verifyPassword } from '../src/utils/jwt';

describe('Auth Utilities', () => {
	const secret = 'test-secret';

	it('should generate and verify a valid JWT token', async () => {
		const token = await generateAccessToken(1, 'test@example.com', 'admin', secret);
		expect(token).toBeDefined();
		expect(typeof token).toBe('string');

		const payload = await verifyToken(token, secret);
		expect(payload).toBeDefined();
		expect(payload.id).toBe(1);
		expect(payload.email).toBe('test@example.com');
		expect(payload.role).toBe('admin');
	});

	it('should return null for an invalid token', async () => {
		const payload = await verifyToken('invalid-token', secret);
		expect(payload).toBeNull();
	});

	it('should hash and verify a password', async () => {
		const password = 'password123';
		const hash = await hashPassword(password);
		expect(hash).toBeDefined();
		expect(hash).not.toBe(password);

		const isValid = await verifyPassword(password, hash);
		expect(isValid).toBe(true);

		const isInvalid = await verifyPassword('wrongpassword', hash);
		expect(isInvalid).toBe(false);
	});
});
