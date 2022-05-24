import crypto from 'crypto';
import SNS from 'aws-sdk/clients/sns';

import kvdb from '$lib/kvdb';
import { VERCEL_BASE } from '$lib/config';

const { CLIENT_SECRET } = process.env;

const verifySignature = (payload, header) => {
	const signature = crypto
		.createHmac('sha1', CLIENT_SECRET)
		.update(JSON.stringify(payload))
		.digest('hex');

	return signature === header;
};

export async function post({ request }) {
	const data = await request.json();

	const valid = verifySignature(data, request.headers.get('x-vercel-signature'));

	if (!valid) {
		return {
			status: 403
		};
	}

	const {
		type,
		teamId,
		payload: { projectId, url, target }
	} = data;

	if (type !== 'deployment-ready') {
		return {
			status: 200
		};
	}

	const project = await kvdb.get(projectId);
	const configuration = await kvdb.get(project.configurationId);

	const searchParams = new URLSearchParams();

	if (teamId) {
		searchParams.set('teamId', teamId);
	}

	const r = await fetch(`${VERCEL_BASE}/v9/projects/${projectId}/env?${searchParams}`, {
		headers: {
			authorization: `Bearer ${configuration.access_token}`
		}
	});

	const { envs } = await r.json();

	const keyId = envs.find((e) => e.key === 'AWS_ACCESS_KEY_ID_SNS');
	const key = envs.find((e) => e.key === 'AWS_SECRET_ACCESS_KEY_SNS');

	if (!keyId || !key) {
		return {
			status: 200
		};
	}

	const rAccessKeyId = await fetch(
		`${VERCEL_BASE}/v9/projects/${projectId}/env/${keyId.id}?${searchParams}`,
		{
			headers: {
				authorization: `Bearer ${configuration.access_token}`
			}
		}
	);

	const { value: accessKeyId } = await rAccessKeyId.json();

	const rSecretAccessKey = await fetch(
		`${VERCEL_BASE}/v9/projects/${projectId}/env/${key.id}?${searchParams}`,
		{
			headers: {
				authorization: `Bearer ${configuration.access_token}`
			}
		}
	);

	const { value: secretAccessKey } = await rSecretAccessKey.json();

	const base = target === 'production' ? project.production : url;
	const endpoints = project.endpoints.filter((e) => {
		if (target === 'production') {
			return e.production;
		}

		return e.preview;
	});

	if (!endpoints.length) {
		return {
			status: 200
		};
	}

	const filteredEndpoints = endpoints.map((e) => ({
		url: `https://${base}${e.url}`,
		topic: e.topic,
		origin: base
	}));

	const sns = new SNS({
		credentials: {
			accessKeyId,
			secretAccessKey
		},
		region: project.region
	});

	for (const endpoint of filteredEndpoints) {
		const subscriptions = await sns
			.listSubscriptionsByTopic({
				TopicArn: endpoint.topic
			})
			.promise();

		const currentEndpoints = subscriptions.Subscriptions.map((s) => s.Endpoint);

		if (currentEndpoints.includes(endpoint.url)) {
			continue;
		}

		const subscribeOptions = {
			Protocol: 'https',
			TopicArn: endpoint.topic,
			Endpoint: endpoint.url
		};

		if (project.filterByOrigin) {
			subscribeOptions.FilterPolicy = {
				origin: [endpoint.origin]
			};
		}

		await sns.subscribe(subscribeOptions).promise();
	}

	return {
		status: 200
	};
}
