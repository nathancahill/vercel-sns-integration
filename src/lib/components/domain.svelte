<script>
	export let domain;
	export let production;
	export let preview;
</script>

<tr>
	<td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0"
		><code>{domain.domain}</code></td
	>
	<td class="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
		{#if domain.production}
			<input
				name="production"
				type="radio"
				bind:group={production}
				value={domain.domain}
				class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
			/>
		{/if}
	</td>
	<td class="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
		{#if domain.preview}
			<input
				bind:checked={preview}
				name="preview"
				type="checkbox"
				class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
			/>
		{/if}</td
	>
</tr>
