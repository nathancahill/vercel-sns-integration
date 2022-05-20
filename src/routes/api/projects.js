import kvdb from '$lib/kvdb';
import { VERCEL_BASE } from '$lib/config';

export async function get({ url }) {
	const configurationId = url.searchParams.get('configurationId');
	const integration = await kvdb.get(configurationId);

	if (!integration) {
		return {
			status: 404
		};
	}

	const { access_token, team_id } = integration;

	const searchParams = new URLSearchParams();

	if (team_id) {
		searchParams.set('teamId', team_id);
	}

	const r = await fetch(`${VERCEL_BASE}/v9/projects?${searchParams}`, {
		headers: {
			authorization: `Bearer ${access_token}`
		}
	});

	const j = await r.json();

	const projects = j.projects.map((p) => ({
		name: p.name,
		id: p.id,
		alias: p.targets?.production?.alias || []
	}));

	return {
		body: {
			projects
		}
	};
}
