import crypto from 'crypto';

import kvdb from '$lib/kvdb';

const { CLIENT_SECRET } = process.env;

const verifySignature = (payload, header) => {
	const signature = crypto.createHmac('sha1', CLIENT_SECRET).update(payload).digest('hex');
	return signature === header;
};

export async function post({ request, headers }) {
	const data = await request.json();

	const valid = verifySignature(data, headers.get('x-vercel-signature'));

	if (!valid) {
		return {
			status: 403
		};
	}

	const {
		type,
		payload: { projectId }
	} = data;

	if (type !== 'deployment-ready') {
		return {
			status: 404
		};
	}

	const configuration = await kvdb.get(projectId);

	console.log(configuration);

	// Configure AWS

	return {
		status: 200
	};
}
