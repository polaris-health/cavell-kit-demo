// Side-effect stylesheet imports, typed here instead of referencing vite/client — the demo reads all
// its runtime configuration from the URL, so only the build-mode flag is needed.
declare module '*.css'

interface ImportMetaEnv {
	readonly DEV: boolean
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
