<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let on = false;

	const handleClick = () => {
		dispatch('change', !on);
	};
</script>

<button
	type="button"
	class:bg-indigo-600={on}
	class:bg-gray-200={!on}
	on:click={handleClick}
	class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
	role="switch"
	aria-checked={on}
>
	<span class="sr-only">Use setting</span>
	<span
		aria-hidden="true"
		class:translate-x-5={on}
		class:translate-x-0={!on}
		class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
	/>
</button>
