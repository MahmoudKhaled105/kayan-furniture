// Shared utilities

export function jsonResponse(data: unknown, status = 200): Response {
	return Response.json(data, { status });
}

export function errorResponse(error: string, message: string, status: number): Response {
	return Response.json({ error, message, status }, { status });
}

export function parseId(raw: string | undefined): number | null {
	if (!raw) return null;
	const n = parseInt(raw, 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export function roundMoney(n: number): number {
	return Math.round(n * 100) / 100;
}

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
	try {
		return (await req.json()) as T;
	} catch {
		return {} as T;
	}
}

export function today(): string {
	return new Date().toISOString().slice(0, 10);
}
