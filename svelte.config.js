import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			// SPA fallback — serve this for any route not matching a static file
			// Critical for /sign?s=... client-side routing to work
			fallback: 'index.html'
		}),
		paths: {
			// Set by the GitHub Pages workflow to "/open-multisig-hl".
			// Empty string in local dev/preview so pnpm run dev stays unchanged.
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
