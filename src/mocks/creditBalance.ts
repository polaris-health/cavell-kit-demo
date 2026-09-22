/**
 * Harness-only mock of the backend's `/credits` side channel (ADR 0017 D1).
 *
 * The tiers and the "Upgrade" behaviour are host configuration, but the BALANCE is read from the
 * Cavell backend — so the states worth looking at (nearly out, out, unlimited, a stack with no
 * credit licensing at all) normally need an account that happens to be in them. This answers that
 * one GET from the numbers typed into the harness panel's Credits section instead, which puts the
 * usage ring, the banner ladder, the usage panel and the out-of-credits refusal one field away.
 *
 * Scaffolding, not a pattern to copy into an embedding: a host READS the balance, never writes one.
 */
import { type CreditBalanceResponse, type CreditUseCase, endpoints } from '@cavell/kit'

export interface CreditMockState {
	enabled: boolean
	creditsRemaining: number
	/** Null is the unlimited tier: no allowance for the warning/critical ladder to be a share of. */
	monthlyAllotment: number | null
	/** Matched against `CreditPlan.tier` to mark that row "Current" in the upsell. */
	tier: string
	/** False is `configured: false` — the stack has no credit licensing and the surface renders nothing. */
	licensed: boolean
}

/** Enabling the mock should visibly do something, so the seed sits in the warning band (8/50). */
const DEFAULT_STATE: CreditMockState = {
	enabled: false,
	creditsRemaining: 8,
	monthlyAllotment: 50,
	tier: 'TIER_1',
	licensed: true,
}

/** The breakdown table needs rows. Rates are the shape of the real ones (a cheap search, a full
 *  note, a chat turn); `share` splits the consumed credits across them. */
const SAMPLE_USE_CASES: (Omit<CreditUseCase, 'transactions' | 'credits'> & { share: number })[] = [
	{ use_case: 'Evidence search', provider: 'Ask Aletta', model: null, rate: 0.25, share: 0.45 },
	{ use_case: 'Consultation note', provider: 'OpenAI', model: 'gpt-transcribe', rate: 1, share: 0.4 },
	{ use_case: 'Chat turn', provider: 'OpenAI', model: 'gpt-5.6-sol', rate: 0.1, share: 0.15 },
]

/** What an unlimited tier's breakdown is scaled to — there is no allowance to subtract from. */
const UNLIMITED_CONSUMED = 40

/** The mock state as the payload `fetchCreditBalance` expects. */
export const buildBalanceResponse = (state: CreditMockState, now: Date = new Date()): CreditBalanceResponse => {
	if (!state.licensed) {
		return { configured: false }
	}

	const allotment = state.monthlyAllotment
	// A topped-up balance can exceed its own allowance, so consumption floors at 0 like the kit's.
	const consumed = allotment === null ? UNLIMITED_CONSUMED : Math.max(0, allotment - state.creditsRemaining)
	// The first of next month, UTC: the reset date carries no time zone, like the backend's.
	const resets = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

	return {
		configured: true,
		tier: state.tier || null,
		credits_remaining: state.creditsRemaining,
		monthly_allotment: allotment,
		cycle_resets_on: resets.toISOString().slice(0, 10),
		use_cases: SAMPLE_USE_CASES.map(({ share, ...row }) => {
			const credits = Math.round(consumed * share * 100) / 100

			return { ...row, credits, transactions: row.rate === null ? null : Math.round(credits / row.rate) }
		}),
	}
}

let snapshot: CreditMockState = DEFAULT_STATE

const listeners = new Set<() => void>()

export const subscribeCreditMock = (listener: () => void) => {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

/** Stable between notifications, as useSyncExternalStore requires. */
export const getCreditMock = (): CreditMockState => snapshot

/** Merge a change in. Callers follow it with `credits.refresh()`: the kit re-reads the balance on
 *  its own schedule (boot, after a run, when the panel opens) and knows nothing about this. */
export const setCreditMock = (patch: Partial<CreditMockState>) => {
	snapshot = { ...snapshot, ...patch }
	for (const listener of listeners) {
		listener()
	}
}

/** A GET on the credits path, whatever origin `?base=` put in front of it. */
const balanceRead = (input: RequestInfo | URL, init?: RequestInit): boolean => {
	const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
	if (method !== 'GET') {
		return false
	}

	try {
		const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)

		return url.pathname === endpoints.companion.credits
	} catch {
		return false
	}
}

let installed = false

/** Patch `window.fetch` once, at boot. Inert while the mock is off, which is why it is installed in
 *  every build rather than dev only: the Playwright suites never tick the box, so they never see it. */
const installCreditBalanceMock = () => {
	if (installed) {
		return
	}
	installed = true

	const realFetch = window.fetch.bind(window)

	window.fetch = async (input, init) => {
		if (!snapshot.enabled || !balanceRead(input, init)) {
			return realFetch(input, init)
		}

		return new Response(JSON.stringify(buildBalanceResponse(snapshot)), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

export default installCreditBalanceMock
