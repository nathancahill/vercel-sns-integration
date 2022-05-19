<script>
	import Highlight from 'svelte-highlight';
	import json from 'svelte-highlight/languages/json';
	import javascript from 'svelte-highlight/languages/javascript';
	import github from 'svelte-highlight/styles/github';

	const languages = {
		json,
		javascript
	};

	export let code;
	export let language;
</script>

<svelte:head>
	{@html github}
</svelte:head>

<div class="code text-sm">
	<Highlight language={languages[language]} {code} />
</div>

<style>
	.code :global(pre code) {
		padding: 0;
	}
</style>
