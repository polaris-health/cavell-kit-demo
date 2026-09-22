import type { CreditPlan } from '@cavell/kit'

/** The tiers Corilus configures today: 50 credits included free, or unlimited for €33.63/mo.
 *  Prices belong to the integrator, never to the kit (ADR 0017 D4) — this is the demo playing
 *  that role, and the harness panel lets you edit it live. */
export const DEFAULT_CREDIT_PLANS: CreditPlan[] = [
	{ tier: 'TIER_1', credits: 50, price: 0 },
	{ tier: 'TIER_2', credits: null, price: 33.63 },
]

/** Credits included free every month — the baseline the plans build on. */
export const DEFAULT_INCLUDED_CREDITS = 50

/** Only the three REQUIRED fields are checked: optional per-tier copy (`label`/`note`, a string or
 *  a locale map) rides along untouched, which is what lets the harness demo it by typing JSON. */
const isPlan = (value: unknown): value is CreditPlan => {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	const plan = value as Record<string, unknown>

	return (
		typeof plan.tier === 'string' &&
		(plan.credits === null || typeof plan.credits === 'number') &&
		typeof plan.price === 'number'
	)
}

/** The harness panel's plans JSON → the `credits.plans` prop. Lenient like the recording-context
 *  parser: a half-typed draft falls back to no plans (the panel then shows no upsell) instead of
 *  throwing mid-keystroke. */
const parseCreditPlans = (raw: string): CreditPlan[] => {
	try {
		const parsed: unknown = JSON.parse(raw)

		return Array.isArray(parsed) && parsed.every(isPlan) ? parsed : []
	} catch {
		return []
	}
}

export default parseCreditPlans
