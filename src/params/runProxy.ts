/** `?proxy=` — routing the AG-UI run through the CareConnect AI smart proxy while every side
 *  channel keeps going straight to the Cavell backend (the recommended proxy setup, cavell-docs
 *  proxy.md). The demo only AUTHORS the `runUrl` the kit takes; nothing here is kit behavior. */
import { type BackendKey, RUN_PROXIES, type RunProxyKey, isBackendKey, isRunProxyKey } from './typeguards'

/** The proxy environment Corilus integrates on; qa answers CORS preflights with 403 (2026-09-10). */
export const DEFAULT_PROXY_KEY: RunProxyKey = 'acc'

/** The proxy addresses agents by their REGISTRY name, not the Cavell agent id. `cavell-gp` and
 *  `cavell-specialist` are what the ACC proxy's `GET /v1/agents` listed for our bearer (2026-09-10);
 *  the other agents follow the same spelling by convention only — `?proxy_agent=` overrides. */
const PROXY_AGENT_NAMES_BY_AGENT: Readonly<Record<string, string>> = {
	careconnect_gp: 'cavell-gp',
	careconnect_specialist: 'cavell-specialist',
}

/** The dropdown's fixed rows: every registry name we know of. */
export const KNOWN_PROXY_AGENT_NAMES: readonly string[] = Object.values(PROXY_AGENT_NAMES_BY_AGENT)

export const defaultProxyAgentName = (agentId: string): string =>
	PROXY_AGENT_NAMES_BY_AGENT[agentId] ?? `cavell-${agentId.replace(/^careconnect_/, '').replace(/_/g, '-')}`

/** A known key resolves to its origin; anything else is a literal proxy origin. '' = no proxy. */
export const resolveProxyOrigin = (value: string): string | undefined => {
	if (!value) {
		return undefined
	}

	const known = RUN_PROXIES.find((proxy) => proxy.key === value)

	return known ? known.origin : value.replace(/\/$/, '')
}

/** Corilus' path convention: `POST /v1/agents/{name}/copilotkit` (equivalently `POST /copilotkit`
 *  with `{"agent": name}` in the body — the path form needs no body change, so the kit can use it). */
export const proxyRunUrl = (origin: string, proxyAgent: string): string =>
	`${origin}/v1/agents/${encodeURIComponent(proxyAgent)}/copilotkit`

/** The proxy for the backend the demo already targets: each proxy forwards to its own
 *  environment's Cavell backend, and threads live server-side, so the run (via proxy) and the
 *  history/feedback calls (direct) must land on the same one. */
export const suggestedProxyKey = (backend: string): string =>
	RUN_PROXIES.find((proxy) => proxy.backend === backend)?.key ?? DEFAULT_PROXY_KEY

/** The backend a known proxy forwards to; undefined for a literal origin (unknowable here). */
export const proxyBackendKey = (proxy: string): BackendKey | undefined =>
	isRunProxyKey(proxy) ? RUN_PROXIES.find((candidate) => candidate.key === proxy)?.backend : undefined

/** Human-readable reason the drafted proxy + backend pair will misbehave, or '' when it is sound.
 *  Rendered by the config panel; the reload is not blocked — mismatches are worth demonstrating. */
export const proxyPairingWarning = (proxy: string, backend: string): string => {
	const expected = proxyBackendKey(proxy)
	if (backend === '') {
		return `a same-origin backend reads as a bare runUrl to the kit (generic profile, everything off) — pick the ${expected ?? 'matching'} backend`
	}
	if (expected && expected !== backend) {
		return `the ${proxy} proxy forwards to the ${expected} backend — history and feedback would list another environment's threads`
	}
	if (!expected && !isBackendKey(backend)) {
		return 'a custom proxy and a custom backend: make sure the proxy forwards to that same backend'
	}

	return ''
}
