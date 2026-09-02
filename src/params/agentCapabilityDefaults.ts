import type { CavellCapabilities } from '@cavell/kit'

/** Per-agent capability recommendations, mirroring the config table in `cavell-docs/agents.md` —
 *  the demo's baseline before any `?caps=`/checkbox override. An agent id absent here has no
 *  per-agent recommendation and falls through to the kit's own Cavell-profile defaults. Keep in
 *  sync with that table by hand; there is no shared source. */
const AGENT_CAPABILITY_RECOMMENDATIONS: Partial<Record<string, Partial<CavellCapabilities>>> = {
	// Note generation is the only workflow today — starters have nothing else to suggest.
	// `recording` is the core workflow, unlike the GP (not yet fully supported — leave off there).
	careconnect_specialist: { recording: true, starters: false },
}

/** The recommended capability baseline for `agentId`, applied UNDER the kit's own profile
 *  defaults and any explicit override. Bare `runUrl` targeting has no agent id to recommend for
 *  (ADR 0006 D4's generic-profile mode is deliberately capability-off), so it never applies. */
const agentCapabilityDefaults = (agentId: string, genericProfile: boolean): Partial<CavellCapabilities> => {
	return genericProfile ? {} : (AGENT_CAPABILITY_RECOMMENDATIONS[agentId] ?? {})
}

export default agentCapabilityDefaults
