import kvdb from '$lib/kvdb';
import { VERCEL_BASE } from '$lib/config';

export async function get({ url }) {
	const configurationId = url.searchParams.get('configurationId');
	const projectId = url.searchParams.get('projectId');

	const integration = await kvdb.get(configurationId);

	if (!integration) {
		return {
			status: 404
		};
	}

	const { access_token } = integration;
	const configuration = await kvdb.get(projectId);

	const r = await fetch(`${VERCEL_BASE}/v9/projects/${projectId}/env`, {
		headers: {
			authorization: `Bearer ${access_token}`
		}
	});

	const { envs } = await r.json();

	const keyId = !!envs.find((e) => e.key === 'AWS_ACCESS_KEY_ID_SNS');
	const key = !!envs.find((e) => e.key === 'AWS_SECRET_ACCESS_KEY_SNS');

	return {
		body: {
			configuration,
			env: {
				keyId,
				key
			}
		}
	};
}

export async function post({ url, request }) {
	const projectId = url.searchParams.get('projectId');
	const data = await request.json();

	await kvdb.set(projectId, data);

	return {
		status: 201
	};
}
