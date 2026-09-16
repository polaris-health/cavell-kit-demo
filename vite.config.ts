import react from '@vitejs/plugin-react'
import path from 'node:path'
import { type Plugin, defineConfig } from 'vite'

// Peer assets (FontAwesome Pro, Inter, the logo) are served from ./public — they are YOURS to
// provide, see public/README.md. The kit bundles no licensed assets: it emits `fa-light fa-…`
// classes and expects the page to have loaded a FontAwesome that defines them.
//
// VITE_FA_URL is the shortcut for a license you already own — your kit script
// (https://kit.fontawesome.com/<code>.js) or a self-hosted stylesheet — injected into index.html
// instead of copying files into public/:
//
//   VITE_FA_URL=https://kit.fontawesome.com/<code>.js yarn dev:qa
const faUrl = process.env.VITE_FA_URL
const faAssets = (): Plugin => ({
	name: 'cavell-demo-fontawesome',
	transformIndexHtml: () =>
		faUrl
			? [
					faUrl.endsWith('.js')
						? { tag: 'script', attrs: { src: faUrl, crossorigin: 'anonymous' }, injectTo: 'head' as const }
						: { tag: 'link', attrs: { rel: 'stylesheet', href: faUrl }, injectTo: 'head' as const },
				]
			: [],
})

// `yarn dev:remote` / `dev:qa` / `dev:staging` / `dev:prod` (scripts/use-kit.mjs) point this at a
// released @cavell/kit build; unset — plain `yarn dev` — means the version installed in
// node_modules. Subpaths are mapped explicitly because an alias bypasses the `exports` map.
const kitDir = process.env.CAVELL_KIT_DIR
const kitAlias = kitDir
	? [
			{ find: '@cavell/kit/styles.css', replacement: path.join(kitDir, 'dist/styles.css') },
			{ find: '@cavell/kit/tokens.css', replacement: path.join(kitDir, 'dist/tokens.css') },
			{ find: /^@cavell\/kit$/, replacement: path.join(kitDir, 'dist/index.js') },
		]
	: []

export default defineConfig({
	plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } }), faAssets()],
	resolve: {
		alias: kitAlias,
		// The kit's peers must stay single copies whatever the kit was resolved from — two React or
		// two CopilotKit instances mean host tool registrations the kit never sees.
		dedupe: ['react', 'react-dom', '@copilotkit/react-core', '@ag-ui/client', '@ag-ui/core'],
	},
	server: {
		port: 5176,
		// Optional same-origin /api proxy for a locally running Cavell backend. Without it, use
		// the in-app backend picker (?base=qa|staging|prd) — the deployed API origins allow
		// cross-origin calls. `ws: true` is load-bearing: consultation recording streams over a
		// websocket, and the string-shorthand proxy would not forward the upgrade.
		proxy: process.env.VITE_BACKEND
			? { '/api': { target: process.env.VITE_BACKEND, changeOrigin: true, ws: true } }
			: undefined,
	},
})
