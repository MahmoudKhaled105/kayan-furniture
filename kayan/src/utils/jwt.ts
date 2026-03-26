import * as jose from 'jose';
import bcrypt from 'bcryptjs';

/**
 * Generate a JWT access token
 */
export async function generateAccessToken(
	userId: number,
	email: string,
	role: string,
	secret: string
): Promise<string> {
	const jwtSecret = new TextEncoder().encode(secret);
	return await new jose.SignJWT({ id: userId, email, role })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h') // Access token expires in 1 hour
		.sign(jwtSecret);
}

/**
 * Generate a refresh token (typically longer lived)
 */
export async function generateRefreshToken(userId: number, secret: string): Promise<string> {
	const jwtSecret = new TextEncoder().encode(secret);
	return await new jose.SignJWT({ id: userId })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('30d') // Refresh token expires in 30 days
		.sign(jwtSecret);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<any> {
	try {
		const jwtSecret = new TextEncoder().encode(secret);
		const { payload } = await jose.jwtVerify(token, jwtSecret);
		return payload;
	} catch (err) {
		console.error('Token verification failed:', err);
		return null;
	}
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(10, (err, salt) => {
			if (err || !salt) return reject(err || new Error('Salt generation failed'));
			bcrypt.hash(password, salt, (err, hash) => {
				if (err || !hash) return reject(err || new Error('Hashing failed'));
				resolve(hash);
			});
		});
	});
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		bcrypt.compare(password, hash, (err, result) => {
			if (err) return reject(err);
			resolve(!!result);
		});
	});
}
