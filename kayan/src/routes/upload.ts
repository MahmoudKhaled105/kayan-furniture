import { Router } from '../router';

export function registerUploadRoutes(router: Router) {
	// POST /api/v1/upload
	router.post('api/v1/upload', async (req, env) => {
		try {
			const formData = await req.formData();
			const file = formData.get('file') as File;

			if (!file) {
				return Response.json({ error: 'bad_request', message: 'No file provided' }, { status: 400 });
			}

			// Generate a unique filename
			const timestamp = Date.now();
			const filename = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;

			// Store in R2
			// In local dev, wrangler will store this in .wrangler/state/v3/r2
			await env.ASSETS.put(filename, await file.arrayBuffer(), {
				httpMetadata: {
					contentType: file.type,
				},
			});

			// Return the URL
			// For local dev, we don't have a public URL by default, 
			// but we can serve it back through the worker.
			// For simplicity in this demo, we'll return a relative URL
			// and add a route to serve it.
			const url = `/api/v1/assets/${filename}`;

			return Response.json({ url, filename });
		} catch (err: any) {
			console.error('Upload error:', err);
			return Response.json({ error: 'internal_error', message: err.message }, { status: 500 });
		}
	});

	// GET /api/v1/assets/:filename
	router.get('api/v1/assets/:filename', async (_req, env, params) => {
		const filename = params.filename;
		const object = await env.ASSETS.get(filename);

		if (!object) {
			return new Response('Not Found', { status: 404 });
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set('etag', object.httpEtag);

		return new Response(object.body, {
			headers,
		});
	});
}
