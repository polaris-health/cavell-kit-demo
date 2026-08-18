/** Type guards for the enum-ish URL params, colocated with the allowlists they narrow against. */
import { type AutoScrollMode, type CavellCapabilities, DISPLAY_MODES, type DisplayMode } from '@cavell/kit'

/** Selectable backends — the API origins, per `cavell-ai-assistant/ENVIRONMENTS.md`
 *  (VITE_CAVELL_API_URL), NOT the companion.* frontend hosts. `local` is '' = same-origin: the dev
 *  server's /api proxy and the E2E reverse proxy both live there, so it stays the default. The
 *  deployed origins are called cross-origin, which the API allows (`Allow-Origin: *`). */
export const BACKENDS = [
	{ key: 'local', label: 'local — same-origin (/api proxy)', baseUrl: '' },
	{ key: 'qa', label: 'qa — qa.corilus.cavell.app', baseUrl: 'https://qa.corilus.cavell.app' },
	{ key: 'staging', label: 'staging — staging.corilus.cavell.app', baseUrl: 'https://staging.corilus.cavell.app' },
	{ key: 'prd', label: 'prd — corilus.cavell.app', baseUrl: 'https://corilus.cavell.app' },
] as const

export type BackendKey = (typeof BACKENDS)[number]['key']

/** `?base=` is deliberately open — a value matching no key is a literal API origin, so this guard
 *  answers "is it a preset?", never "is it valid?". */
export const isBackendKey = (value: unknown): value is BackendKey => {
	return typeof value === 'string' && BACKENDS.some((backend) => backend.key === value)
}

/** The kit exports `AutoScrollMode` as a type only, so `satisfies` is what keeps this runtime
 *  allowlist pinned to the union. */
export const AUTO_SCROLL_MODES = [
	'pin-to-bottom',
	'pin-to-send',
	'hold-on-send',
	'none',
] as const satisfies readonly AutoScrollMode[]

export const isAutoScrollMode = (value: unknown): value is AutoScrollMode => {
	return typeof value === 'string' && (AUTO_SCROLL_MODES as readonly string[]).includes(value)
}

/** Unlike `AutoScrollMode`, the kit exports its display-mode allowlist as a VALUE — so this
 *  narrows against the kit's own list and can never drift from it. */
export const isDisplayMode = (value: unknown): value is DisplayMode => {
	return typeof value === 'string' && (DISPLAY_MODES as readonly string[]).includes(value)
}

export const CAPABILITY_KEYS = [
	'sessions',
	'feedback',
	'starters',
	'nativeHitl',
] as const satisfies readonly (keyof CavellCapabilities)[]

/** `?caps=` overrides are known boolean flags only. An unknown key or a non-boolean means the whole
 *  override is a typo, and half-applying a typo is worse than ignoring it. */
export const isCapabilityOverrides = (value: unknown): value is Partial<CavellCapabilities> => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false
	}

	return Object.entries(value).every(
		([key, flag]) => (CAPABILITY_KEYS as readonly string[]).includes(key) && typeof flag === 'boolean',
	)
}
