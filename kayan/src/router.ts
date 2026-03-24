// Lightweight router for Cloudflare Workers

export type RouteHandler = (
	req: Request,
	env: Env,
	params: Record<string, string>,
	query: Record<string, string>
) => Promise<Response>;

interface Route {
	method: string;
	pattern: string;
	segments: string[];
	handler: RouteHandler;
}

export class Router {
	private routes: Route[] = [];

	private addRoute(method: string, pattern: string, handler: RouteHandler) {
		const segments = pattern === '/' || pattern === '' ? [] : pattern.replace(/^\/|\/$/g, '').split('/');
		this.routes.push({ method, pattern, segments, handler });
	}

	get(pattern: string, handler: RouteHandler) {
		this.addRoute('GET', pattern, handler);
	}
	post(pattern: string, handler: RouteHandler) {
		this.addRoute('POST', pattern, handler);
	}
	patch(pattern: string, handler: RouteHandler) {
		this.addRoute('PATCH', pattern, handler);
	}
	put(pattern: string, handler: RouteHandler) {
		this.addRoute('PUT', pattern, handler);
	}
	delete(pattern: string, handler: RouteHandler) {
		this.addRoute('DELETE', pattern, handler);
	}

	private matchRoute(
		method: string,
		pathname: string
	): { route: Route; params: Record<string, string> } | null {
		const parts = pathname === '/' || pathname === '' ? [] : pathname.replace(/^\/|\/$/g, '').split('/');

		for (const route of this.routes) {
			if (route.method !== method) continue;
			if (route.segments.length !== parts.length) continue;

			const params: Record<string, string> = {};
			let match = true;

			for (let i = 0; i < route.segments.length; i++) {
				const seg = route.segments[i];
				if (seg.startsWith(':')) {
					params[seg.slice(1)] = parts[i];
				} else if (seg !== parts[i]) {
					match = false;
					break;
				}
			}

			if (match) return { route, params };
		}

		return null;
	}

	async handle(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);
		const result = this.matchRoute(req.method, url.pathname);

		if (!result) {
			return Response.json(
				{ error: 'not_found', message: `No route matches ${req.method} ${url.pathname}`, status: 404 },
				{ status: 404 }
			);
		}

		const query: Record<string, string> = {};
		url.searchParams.forEach((v, k) => {
			query[k] = v;
		});

		try {
			return await result.route.handler(req, env, result.params, query);
		} catch (err: any) {
			console.error('Unhandled error:', err);
			return Response.json(
				{ error: 'internal_error', message: err?.message ?? 'Internal server error', status: 500 },
				{ status: 500 }
			);
		}
	}
}
