/**
 * The demo's whole configuration surface: every URL search param, parsed and validated once.
 * The reader's table lives in ../../README.md.
 */
import { type AutoScrollMode, type CavellCapabilities, type DisplayMode, genericProfileTarget } from '@cavell/kit'

import agentCapabilityDefaults from './agentCapabilityDefaults'
import { defaultProxyAgentName, proxyRunUrl, resolveProxyOrigin } from './runProxy'
import { BACKENDS, isAutoScrollMode, isCapabilityOverrides, isContextObject, isDisplayMode } from './typeguards'

const DEFAULT_NONCE = 'KD-NONCE'
const DEFAULT_AGENT_ID = 'careconnect_gp'

interface DemoParams {
	token: string // Empty means the token form asks for one instead of mounting the provider.
	agent: string
	/** `?agent_version=N` pins one backend version of the agent (ADR 0012); absent = latest stable. */
	agentVersion: number | undefined
	base: string // Raw `?base=`: a BackendKey or a literal origin; the provider takes `baseUrl`.
	baseUrl: string
	/** The run endpoint the provider takes: an explicit `?run_url=` (any AG-UI agent) wins, else the
	 *  CareConnect proxy's run URL when `?proxy=` is set, else undefined (the kit builds the direct
	 *  `{baseUrl}/api/v2/ai-companion/agents/{agent}/run` itself). */
	runUrl: string | undefined
	explicitRunUrl: string | undefined // Raw `?run_url=` for the config-form input.
	/** Raw `?proxy=`: a RunProxyKey (`qa`/`acc`) or a literal proxy origin; '' = direct to the
	 *  backend. Toggles the kit-via-proxy traffic pattern of cavell-docs/proxy.md: the run through
	 *  the CareConnect AI smart proxy, everything else straight to `baseUrl`. */
	proxy: string
	proxyOrigin: string | undefined
	/** The agent's name in the proxy's registry (`?proxy_agent=`; defaults per `agent`). */
	proxyAgent: string
	caps: string // Raw `?caps=` for the config-form input, beside the validated overrides the provider takes.
	capabilities: Partial<CavellCapabilities> | undefined
	threadId: string | undefined
	contextJson: string // Raw `?context=` for the config-form textarea, beside the parsed object below.
	/** The whole initial host context, verbatim. When present it REPLACES the single-key params
	 *  below (patient/patient_name/problem/specialty) — see createInitialContext. */
	initialContext: Record<string, unknown> | undefined
	patientId: string | undefined
	patientName: string | undefined
	/** Host-declared FHIR administrative gender (male/female/other/unknown) — a first-class
	 *  context element: it feeds the specialist note template's Patient context. */
	patientGender: string | undefined
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
export const resolveBaseUrl = (value: string): string => {
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

/** Same policy as `?caps=`: a malformed value is a URL typo — warn and fall through to the
 *  single-key params, rather than taking the demo down mid-render. The harness panel has a
 *  textarea for this value, which validates before it ever reaches the URL. */
const parseContext = (raw: string): Record<string, unknown> | undefined => {
	if (!raw) {
		return undefined
	}

	try {
		const parsed: unknown = JSON.parse(raw)
		if (isContextObject(parsed)) {
			return parsed
		}
	} catch {
		// A SyntaxError and a well-formed non-object (array, number, null) share the warning below.
	}

	console.warn(`[kit-demo] ignoring malformed ?context= (${raw})`)

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

/** A positive integer, or undefined: the backend rejects anything else with a 400, but the demo
 *  should not even ask — a garbled pin silently falls back to the default version. */
const parseAgentVersion = (raw: string | null): number | undefined =>
	raw && /^[1-9][0-9]*$/.test(raw) ? Number(raw) : undefined

const readDemoParams = (search: string): DemoParams => {
	const params = new URLSearchParams(search)
	const base = params.get('base') ?? ''
	const caps = params.get('caps') ?? ''
	const context = params.get('context') ?? ''
	const autoScroll = params.get('auto_scroll')
	const agent = params.get('agent') || DEFAULT_AGENT_ID
	const explicitRunUrl = params.get('run_url') || undefined
	const baseUrl = resolveBaseUrl(base)
	const proxy = params.get('proxy') ?? ''
	const proxyOrigin = resolveProxyOrigin(proxy)
	const proxyAgent = params.get('proxy_agent') || defaultProxyAgentName(agent)
	// A bare endpoint is the more specific ask; the proxy toggle only authors a runUrl of its own.
	const runUrl = explicitRunUrl ?? (proxyOrigin ? proxyRunUrl(proxyOrigin, proxyAgent) : undefined)

	return {
		token: params.get('token') ?? '',
		agent,
		agentVersion: parseAgentVersion(params.get('agent_version')),
		base,
		baseUrl,
		runUrl,
		explicitRunUrl,
		proxy,
		proxyOrigin,
		proxyAgent,
		caps,
		// The agent's recommended baseline (cavell-docs/agents.md), with any explicit ?caps=
		// override layered on top — the kit's own profile defaults fill the rest.
		capabilities: {
			...agentCapabilityDefaults(agent, genericProfileTarget(runUrl, baseUrl)),
			...parseCapabilities(caps),
		},
		threadId: params.get('thread') || undefined,
		contextJson: context,
		initialContext: parseContext(context),
		patientId: params.get('patient') || undefined,
		patientName: params.get('patient_name') || undefined,
		patientGender: params.get('patient_gender') || undefined,
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
