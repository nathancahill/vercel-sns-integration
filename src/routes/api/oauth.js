import kvdb from '$lib/kvdb';
import { VERCEL_BASE } from '$lib/config';

const { APP_DOMAIN, CLIENT_ID, CLIENT_SECRET } = process.env;

export async function post({ request }) {
	const { code, next } = await request.json();

	const searchParams = new URLSearchParams();

	searchParams.set('client_id', CLIENT_ID);
	searchParams.set('client_secret', CLIENT_SECRET);
	searchParams.set('code', code);
	searchParams.set('redirect_uri', `${APP_DOMAIN}/configure`);

	const tokenRes = await fetch(`${VERCEL_BASE}/v2/oauth/access_token`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: searchParams
	});

	const { access_token, token_type, installation_id, user_id, team_id } = await tokenRes.json();

	await kvdb.set(installation_id, {
		access_token,
		token_type,
		installation_id,
		user_id,
		team_id
	});

	return { body: { next } };
}
