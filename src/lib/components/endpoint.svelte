<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import Toggle from '$lib/components/toggle.svelte';

	const dispatch = createEventDispatcher();

	export let endpoint;
	export let i;

	let firstInput;

	const handleChange = (environment) => (e) => {
		endpoint[environment] = e.detail;
	};

	const handleRemove = () => {
		dispatch('remove', i);
	};

	const handleKeypress = (e) => {
		if (e.key === 'Enter') {
			endpoint.editing = false;
		}
	};

	onMount(() => {
		if (endpoint.editing) {
			firstInput.focus();
		}
	});
</script>

<tr>
	<td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
		{#if endpoint.editing}
			<div>
				<label for="url" class="sr-only">URL</label>
				<input
					bind:this={firstInput}
					bind:value={endpoint.url}
					on:keypress={handleKeypress}
					type="text"
					name="url"
					id="url"
					class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
					placeholder="/project/endpoint"
				/>
			</div>
		{:else}
			<code>{endpoint.url}</code>
		{/if}
	</td>
	<td class="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
		{#if endpoint.editing}
			<div>
				<label for="url" class="sr-only">Topic</label>
				<input
					bind:value={endpoint.topic}
					on:keypress={handleKeypress}
					type="text"
					name="topic"
					id="topic"
					class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
					placeholder="sns-topic"
				/>
			</div>
		{:else}
			<code>{endpoint.topic}</code>
		{/if}
	</td>
	<td class="whitespace-nowrap py-4 px-3 text-sm text-gray-500"
		><Toggle on:change={handleChange('production')} on={endpoint.production} /></td
	>
	<td class="whitespace-nowrap py-4 px-3 text-sm text-gray-500"
		><Toggle on:change={handleChange('preview')} on={endpoint.preview} /></td
	>
	<td
		class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 md:pr-0"
	>
		{#if !endpoint.editing}
			<span
				on:click={() => {
					endpoint.editing = true;
				}}
				class="text-indigo-600 hover:text-indigo-900 cursor-pointer">Edit</span
			>
		{/if}
	</td>
	<td
		class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 md:pr-0"
	>
		{#if !endpoint.editing}
			<span on:click={handleRemove} class="text-indigo-600 hover:text-indigo-900 cursor-pointer"
				>Delete</span
			>
		{:else}
			<span
				on:click={() => {
					endpoint.editing = false;
				}}
				class="text-indigo-600 hover:text-indigo-900 cursor-pointer">Save</span
			>
		{/if}
	</td>
</tr>
