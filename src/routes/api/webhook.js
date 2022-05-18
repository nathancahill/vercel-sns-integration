import kvdb from '$lib/kvdb';

export async function get({ request }) {
	const data = await request.json();
	const { projectId } = data;

	const configuration = await kvdb.get(projectId);

	// Configure AWS

	return {
		status: 200
	};
}
