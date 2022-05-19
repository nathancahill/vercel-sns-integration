import adapter from '@sveltejs/adapter-auto';

const config = {
	kit: {
		adapter: adapter(),
		vite: {
			optimizeDeps: {
				include: ['highlight.js', 'highlight.js/lib/core']
			}
		}
	}
};

export default config;
