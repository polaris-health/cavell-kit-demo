/**
 * The demo's whole configuration surface: every URL search param, parsed and validated once.
 * The reader's table lives in ../../README.md.
 */
import type { AutoScrollMode, CavellCapabilities, DisplayMode } from '@cavell/kit'

import { BACKENDS, isAutoScrollMode, isCapabilityOverrides, isDisplayMode } from './typeguards'

const DEFAULT_NONCE = 'KD-NONCE'
const DEFAULT_AGENT_ID = 'careconnect_gp'

interface DemoParams {
	token: string // Empty means the token form asks for one instead of mounting the provider.
	agent: string
	base: string // Raw `?base=`: a BackendKey or a literal origin; the provider takes `baseUrl`.
	baseUrl: string
	runUrl: string | undefined
	caps: string // Raw `?caps=` for the config-form input, beside the validated overrides the provider takes.
	capabilities: Partial<CavellCapabilities> | undefined
	threadId: string | undefined
	patientId: string | undefined
	patientName: string | undefined
	problem: string | undefined
	/** Host-declared caregiver specialty. Lands in the context as
	 *  `current_caregiver_speciality` — the backend's spelling of the key. */
	specialty: string | undefined
	locale: string | undefined
	prompt: string | undefined
	disablePreloading: boolean
	autoScroll: AutoScrollMode | undefined
	/** Straight to `windowControls.displayModes`: `true` = all three rows, an array picks and
	 *  orders a subset, `false` drops the ⋮ button. */
	displayModes: boolean | DisplayMode[]
	nonce: string
}

/** `1` is what the Playwright suites send, `true` the assistant host's spelling
 *  (cavell-ai-assistant/src/core/utils/truthyFlag.ts) — accept both. */
const truthyFlag = (value: string | null): boolean => {
	return value === '1' || value?.toLowerCase() === 'true'
}

/** An unknown value is taken as a literal API origin, so any stack can be targeted ad hoc. */
const resolveBaseUrl = (value: string): string => {
	const known = BACKENDS.find((backend) => backend.key === value)

	return known ? known.baseUrl : value.replace(/\/$/, '')
}

/** A malformed `?caps=` is a URL typo, not a reason to take the demo down mid-render — the harness
 *  panel offers a free-text box for exactly this value. */
const parseCapabilities = (raw: string): Partial<CavellCapabilities> | undefined => {
	if (!raw) {
		return undefined
	}

	try {
		const parsed: unknown = JSON.parse(raw)
		if (isCapabilityOverrides(parsed)) {
			return parsed
		}
	} catch {
		// Both a SyntaxError and a well-formed-but-wrong shape land on the same warning below.
	}

	console.warn(`[kit-demo] ignoring malformed ?caps= (${raw})`)

	return undefined
}

/** `?display_modes=` picks (and orders) the rows of the kit's ⋮ menu — `none` drops the button.
 *  Same policy as `?caps=`: a value with any unknown mode is a typo, and half-applying a typo is
 *  worse than ignoring it. */
const parseDisplayModes = (raw: string): boolean | DisplayMode[] => {
	if (!raw) {
		return true
	}

	if (raw === 'none') {
		return false
	}

	const requested = raw.split(',').map((value) => value.trim())
	const modes = requested.filter(isDisplayMode)
	if (modes.length === requested.length) {
		return modes
	}

	console.warn(`[kit-demo] ignoring malformed ?display_modes= (${raw})`)

	return true
}

const readDemoParams = (search: string): DemoParams => {
	const params = new URLSearchParams(search)
	const base = params.get('base') ?? ''
	const caps = params.get('caps') ?? ''
	const autoScroll = params.get('auto_scroll')

	return {
		token: params.get('token') ?? '',
		agent: params.get('agent') || DEFAULT_AGENT_ID,
		base,
		baseUrl: resolveBaseUrl(base),
		runUrl: params.get('run_url') || undefined,
		caps,
		capabilities: parseCapabilities(caps),
		threadId: params.get('thread') || undefined,
		patientId: params.get('patient') || undefined,
		patientName: params.get('patient_name') || undefined,
		problem: params.get('problem') || undefined,
		specialty: params.get('specialty') || undefined,
		locale: params.get('locale') || undefined,
		prompt: params.get('prompt') || undefined,
		disablePreloading: truthyFlag(params.get('disable_preloading')),
		autoScroll: isAutoScrollMode(autoScroll) ? autoScroll : undefined,
		displayModes: parseDisplayModes((params.get('display_modes') ?? '').toLowerCase()),
		nonce: params.get('nonce') || DEFAULT_NONCE,
	}
}

/** Read once at import: a config change reloads the page (see reloadWithParams), so these are
 *  page-lifetime constants and re-reading would only invite drift. */
const demoParams = Object.freeze(readDemoParams(window.location.search))

export default demoParams
