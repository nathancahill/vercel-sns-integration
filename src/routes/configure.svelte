<script context="module">
	export async function load({ url, fetch }) {
		const configurationId = url.searchParams.get('configurationId');
		const code = url.searchParams.get('code');
		const projectId = url.searchParams.get('projectId');
		const next = url.searchParams.get('next');

		if (!configurationId) {
			return {
				status: 404
			};
		}

		if (code) {
			const r = await fetch('/api/oauth', {
				method: 'POST',
				body: JSON.stringify({
					code,
					next
				})
			});

			const result = await r.json();

			return {
				redirect: result.next,
				status: 307
			};
		}

		const r = await fetch(`/api/projects?configurationId=${configurationId}`);
		const { projects } = await r.json();

		if (!projects || !projects.length) {
			return {
				status: 404
			};
		}

		if (!projectId) {
			url.searchParams.set('projectId', projects[0].id);

			return {
				redirect: url.href,
				status: 307
			};
		}

		const project = projects.find((v) => v.id === projectId);

		if (!project) {
			return {
				status: 404
			};
		}

		const a = await fetch(`/api/regions`);
		const { regions } = await a.json();

		const p = await fetch(
			`/api/configuration?configurationId=${configurationId}&projectId=${projectId}`
		);
		let { configuration, env } = await p.json();

		if (!configuration) {
			configuration = {
				endpoints: [],
				production: project.alias?.[0],
				preview: true,
				filterByOrigin: true,
				region: 'us-east-1'
			};
		}

		const previewDomain = '[preview-slug].vercel.app';

		const domains = [
			...project.alias.map((a) => ({
				domain: a,
				production: true,
				preview: false
			})),
			...[
				{
					domain: previewDomain,
					production: false,
					preview: true
				}
			]
		];

		const { endpoints, production, preview, filterByOrigin, region } = configuration;

		return {
			props: {
				regions,
				configurationId,
				projectId,
				projects,
				project,
				endpoints,
				domains,
				production,
				preview,
				filterByOrigin,
				region,
				env
			}
		};
	}
</script>

<script>
	import { cloneDeep, isEqual } from 'lodash-es';
	import { goto, afterNavigate, beforeNavigate } from '$app/navigation';

	import Endpoint from '$lib/components/endpoint.svelte';
	import Domain from '$lib/components/domain.svelte';
	import LinkIcon from '$lib/icons/link.svelte';
	import Code from '$lib/components/code.svelte';

	export let regions;
	export let configurationId;
	export let projectId;
	export let projects;
	export let project;
	export let endpoints;
	export let domains;
	export let production;
	export let preview;
	export let filterByOrigin;
	export let region;
	export let env;

	let loading = true;
	let showingPolicy = false;
	let showingOrigin = false;

	let savedConfiguration = cloneDeep({
		configurationId,
		projectId,
		endpoints,
		production,
		preview,
		filterByOrigin,
		region
	});

	$: configuration = {
		configurationId,
		projectId,
		endpoints,
		production,
		preview,
		filterByOrigin,
		region
	};

	$: unsaved = !isEqual(savedConfiguration, configuration);

	const handleSave = async () => {
		endpoints = endpoints.map((e) => ({
			...e,
			editing: false
		}));

		const r = await fetch(`/api/configuration?projectId=${projectId}`, {
			method: 'POST',
			body: JSON.stringify({
				...configuration,
				endpoints
			})
		});

		if (!r.ok) {
		}

		savedConfiguration = cloneDeep(configuration);
	};

	const handleAddEndpoint = () => {
		endpoints = [
			...endpoints,
			{
				url: '',
				topic: '',
				production: true,
				preview: true,
				editing: true
			}
		];
	};

	const handleRemoveEndpoint = (e) => {
		endpoints = endpoints.filter((_, i) => i !== e.detail);
	};

	const handlePolicyPopup = () => {
		showingPolicy = true;
	};

	const handleOriginPopup = () => {
		showingOrigin = true;
	};

	const handlePopupClose = () => {
		showingPolicy = false;
		showingOrigin = false;
	};

	const handleKeydown = (e) => {
		if (e.key === 'Escape') {
			handlePopupClose();
		}
	};

	beforeNavigate(() => {
		loading = true;
	});

	afterNavigate(() => {
		loading = false;

		savedConfiguration = cloneDeep({
			configurationId,
			projectId,
			endpoints,
			production,
			preview,
			filterByOrigin,
			region
		});
	});

	const origin =
		`await sns.publish({
    Message: JSON.stringify({
        email: 'name@example.com',
    }),
    TopicArn: 'arn:aws:sns:us-east-1:xxxxxxxxxx:signup',
    MessageAttributes: {
        origin: {
            DataType: 'String',
            StringValue: proc` +
		`ess.env.VERCEL_URL,
        },
    },
})`;

	const policy = `{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "sns:Subscribe",
            "Resource": "arn:aws:sns:*:*:*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "sns:ListSubscriptionsByTopic",
                "sns:ListTopics"
            ],
            "Resource": "*"
        }
    ]
}`;
</script>

<svelte:head>
	<title>Configure {project.name} - Vercel SNS</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-12">
	<div class="border-b border-gray-200 pb-2 flex">
		<div class="flex-1">
			<label for="location" class="block text-sm font-medium text-gray-700">Project</label>
			<select
				id="location"
				name="location"
				bind:value={projectId}
				on:change={() => {
					// @ts-ignore
					const url = new URL(location);
					url.searchParams.set('projectId', projectId);
					goto(url.href);
				}}
				class="w-64 mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
			>
				{#each projects as p}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-end">
			{#if unsaved && !loading}
				<button
					on:click={handleSave}
					type="button"
					class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>Save Changes</button
				>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="mt-12 flex justify-center">
			<svg
				role="status"
				class="inline w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300"
				viewBox="0 0 100 101"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
					fill="currentColor"
				/>
				<path
					d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
					fill="currentFill"
				/>
			</svg>
		</div>
	{:else}
		<div class="mt-12">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h1 class="text-xl font-semibold text-gray-900">Endpoints</h1>
					<p class="mt-2 text-sm text-gray-700">
						Endpoints to add as an SNS subscription on deploy.
					</p>
				</div>
				<div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
					<button
						on:click={handleAddEndpoint}
						type="button"
						class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>Add endpoint</button
					>
				</div>
			</div>
			<div class="mt-4 flex flex-col">
				<div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						{#if endpoints.length}
							<table class="min-w-full divide-y divide-gray-300">
								<thead>
									<tr>
										<th
											scope="col"
											class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>Endpoint</th
										>
										<th
											scope="col"
											class="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
											>SNS Topic</th
										>
										<th
											scope="col"
											class="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
											>Production</th
										>
										<th
											scope="col"
											class="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Preview</th
										>
										<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0">
											<span class="sr-only">Edit</span>
										</th>
										<th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0">
											<span class="sr-only">Delete</span>
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each endpoints as endpoint, i}
										<Endpoint bind:endpoint on:remove={handleRemoveEndpoint} {i} />
									{/each}
								</tbody>
							</table>
						{:else}
							<div class="border-t border-gray-300">
								<div class="flex justify-center mt-8">
									<LinkIcon class="h-16 w-16 text-gray-600" />
								</div>

								<p class="text-sm text-gray-700 text-center mt-8">Add a project endpoint URL.</p>
								<div class="flex justify-center mt-2">
									<button
										on:click={handleAddEndpoint}
										type="button"
										class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
										>Add endpoint</button
									>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="mt-12">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h1 class="text-xl font-semibold text-gray-900">Domains</h1>
					<p class="mt-2 text-sm text-gray-700">
						Domain or alias to add as an SNS subscription on deploy.
					</p>
				</div>
			</div>
			<div class="mt-4 flex flex-col">
				<div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<table class="min-w-full divide-y divide-gray-300">
							<thead>
								<tr>
									<th
										scope="col"
										class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
										>Domain</th
									>
									<th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
										>Production</th
									>
									<th scope="col" class="py-3.5 px-3 text-left text-sm font-semibold text-gray-900"
										>Preview</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200">
								{#each domains as domain}
									<Domain bind:domain bind:production bind:preview />
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-12">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h1 class="text-xl font-semibold text-gray-900">Filtering</h1>
					<p class="mt-2 text-sm text-gray-700">
						Recommended. Prevent SNS messages from being delivered to mismatched deployments.
						<span
							on:click={handleOriginPopup}
							class="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
							>Show origin setting <span aria-hidden="true">&rarr;</span>
						</span>
					</p>
				</div>
			</div>
			<div class="mt-8 flex flex-col">
				<div class="relative flex items-start">
					<div class="flex items-center h-5">
						<input
							id="comments"
							aria-describedby="comments-description"
							name="comments"
							type="checkbox"
							bind:checked={filterByOrigin}
							class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
						/>
					</div>
					<div class="ml-3 text-sm">
						<label for="comments" class="font-medium text-gray-700">Filter by origin</label>
						<p id="comments-description" class="text-gray-500">
							Requires the origin to be set as an SNS message attribute.
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-12">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h1 class="text-xl font-semibold text-gray-900">Environment Variables</h1>
					<p class="mt-2 text-sm text-gray-700">
						Required for the integration to interact with AWS.
						<span
							on:click={handlePolicyPopup}
							class="font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
							>Show example IAM policy <span aria-hidden="true">&rarr;</span>
						</span>
					</p>
				</div>
			</div>
			<div class="mt-8 flex flex-col">
				<div class="text-sm text-gray-900">
					<p class="mb-2">
						<code class="mr-4">AWS_ACCESS_KEY_ID_SNS</code>
						{#if env.keyId}
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
							>
								Available
							</span>
						{:else}
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
							>
								Missing
							</span>
						{/if}
					</p>
					<p class="mb-2">
						<code class="mr-4">AWS_SECRET_ACCESS_KEY_SNS</code>
						{#if env.key}
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
							>
								Available
							</span>
						{:else}
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
							>
								Missing
							</span>
						{/if}
					</p>
				</div>
			</div>
		</div>

		<div class="mt-12">
			<div class="sm:flex sm:items-center">
				<div class="sm:flex-auto">
					<h1 class="text-xl font-semibold text-gray-900">AWS Region</h1>
					<p class="mt-2 text-sm text-gray-700">AWS region for interacting with the SNS API.</p>
				</div>
			</div>
			<div class="mt-8">
				<div class="flex-1">
					<select
						id="region"
						name="region"
						bind:value={region}
						class="w-64 mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
					>
						{#each regions as r}
							<option value={r}>{r}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		{#if showingPolicy || showingOrigin}
			<div
				class="fixed w-screen h-screen inset-0 bg-black/10 flex items-center justify-center"
				on:click={handlePopupClose}
			>
				<div class="bg-white shadow sm:rounded-lg max-w-6xl" on:click|stopPropagation>
					<div class="px-4 py-5 sm:p-6">
						{#if showingPolicy}
							<h3 class="text-lg leading-6 font-medium text-gray-900">Example IAM Policy</h3>
							<p class="mt-2 text-sm text-gray-700">
								Minimal policy allowing the integration to create subscriptions to topics.
							</p>
							<div class="mt-6 max-w-xl text-sm text-gray-500">
								<Code code={policy} language="json" />
							</div>
						{:else if showingOrigin}
							<h3 class="text-lg leading-6 font-medium text-gray-900">Example SNS Publish</h3>
							<p class="mt-2 text-sm text-gray-700">
								Setting message attributes when a message is added to SNS.
							</p>
							<div class="mt-6 max-w-xl text-sm text-gray-500">
								<Code code={origin} language="javascript" />
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
