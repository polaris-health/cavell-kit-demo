import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// Peer assets (FontAwesome Pro, Inter, the logo) are served from ./public — they are YOURS to
// provide, see public/README.md. The kit bundles no licensed assets.

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
	plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } })],
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
		// cross-origin calls.
		proxy: process.env.VITE_BACKEND ? { '/api': process.env.VITE_BACKEND } : undefined,
	},
})
