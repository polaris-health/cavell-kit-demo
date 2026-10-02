import { useState, useSyncExternalStore } from 'react'

import { useCavellCompanion } from '@cavell/kit'

import {
	type CreditMockState,
	getCreditMock,
	setCreditMock,
	subscribeCreditMock,
} from '../../../../mocks/creditBalance'
import Flag from '../shared/Flag'
import Row from '../shared/Row'
import Section from '../shared/Section'

/** Exercises the credit surface (ADR 0017): `useCavellCompanion().credits`. The capability is ON
 *  by default wherever a `baseUrl` names a Cavell backend — turn it off via the config panel's
 *  `credits` toggle or `?caps={"credits":false}`.
 *
 *  Note what the KIT does not own: the purchase plans and what "Upgrade" does are host
 *  configuration (the `credits` provider prop in App.tsx), because prices are Corilus'. Without
 *  them the panel still shows the balance and the breakdown — it just offers no upsell.
 *
 *  The BALANCE is the backend's, which is why this section can also mock it
 *  (src/mocks/creditBalance.ts): typing a number is how you reach `warning`, `critical` and the
 *  out-of-credits refusal without an account that is actually in those states. */
interface Props {
	upgradeLog: string[]
	creditPlans: string
	onCreditPlansChange: (plans: string) => void
}

const validPlansJson = (raw: string): boolean => {
	try {
		return Array.isArray(JSON.parse(raw))
	} catch {
		return false
	}
}

const CreditsTool = (props: Props) => {
	const { upgradeLog, creditPlans, onCreditPlansChange } = props

	const { capabilities, credits } = useCavellCompanion()

	const mock = useSyncExternalStore(subscribeCreditMock, getCreditMock)
	// The numbers are edited as text so a half-typed value (empty box, a lone "-") is a draft
	// rather than a balance of 0 the ring immediately reacts to.
	const [remainingDraft, setRemainingDraft] = useState(String(mock.creditsRemaining))
	const [allotmentDraft, setAllotmentDraft] = useState(
		mock.monthlyAllotment === null ? '' : String(mock.monthlyAllotment),
	)

	/** The kit re-reads the balance at boot, after every run and when the panel opens; a mock edit
	 *  is none of those, so it asks for the read itself. */
	const applyMock = (patch: Partial<CreditMockState>) => {
		setCreditMock(patch)
		void credits.refresh()
	}

	const onRemainingChange = (raw: string) => {
		setRemainingDraft(raw)
		const value = Number(raw)
		if (raw.trim() !== '' && Number.isFinite(value)) {
			applyMock({ creditsRemaining: value })
		}
	}

	const onAllotmentChange = (raw: string) => {
		setAllotmentDraft(raw)
		const value = Number(raw)
		// An empty allowance is the unlimited tier, not a typo — that is how you reach it here.
		if (raw.trim() === '') {
			applyMock({ monthlyAllotment: null })
		} else if (Number.isFinite(value)) {
			applyMock({ monthlyAllotment: value })
		}
	}

	return (
		<Section title="Credits">
			<div className="kd-chips">
				<Flag label="credits" showActive={capabilities.credits} />
				<Flag label="licensed" showActive={credits.configured} />
				<Flag label="balance readable" showActive={!credits.unavailable} />
				<Flag label="banner" showActive={credits.alertVisible} />
				<Flag label="mocked balance" showActive={mock.enabled} />
			</div>
			<Row label="status">{credits.status}</Row>
			<Row label="remaining">{credits.balance === null ? '—' : String(credits.balance.credits_remaining)}</Row>
			<Row label="allotment">{credits.balance?.monthly_allotment ?? 'unlimited'}</Row>
			<Row label="tier">{credits.balance?.tier ?? '—'}</Row>
			<Row label="resets on">{credits.balance?.cycle_resets_on ?? '—'}</Row>
			<Row label="use cases">{credits.balance?.use_cases.length ?? 0}</Row>
			<Row label="plans">{credits.plans.length}</Row>
			<Row label="upgrade clicks">{upgradeLog.length}</Row>
			{/* The balance is normally the BACKEND's — this answers the kit's `/credits` read locally
			    instead, so every state of the ring, the banner ladder and the run refusal is one
			    number away. Harness scaffolding: a real host never writes a balance. */}
			<label className="kd-mock-check">
				<input
					type="checkbox"
					checked={mock.enabled}
					onChange={(e) => applyMock({ enabled: e.target.checked })}
				/>
				mock balance (harness only)
			</label>
			<div className="kd-mock-fields">
				<label>
					credits remaining
					<input
						inputMode="decimal"
						value={remainingDraft}
						disabled={!mock.enabled}
						onChange={(e) => onRemainingChange(e.target.value)}
					/>
				</label>
				<label>
					monthly allotment
					<input
						inputMode="decimal"
						placeholder="unlimited"
						value={allotmentDraft}
						disabled={!mock.enabled}
						onChange={(e) => onAllotmentChange(e.target.value)}
					/>
				</label>
				<label>
					tier
					<input
						value={mock.tier}
						disabled={!mock.enabled}
						onChange={(e) => applyMock({ tier: e.target.value })}
					/>
				</label>
				{/* Unticking this is the stack with no credit licensing at all: `configured: false`,
				    and the whole surface renders nothing — the intended degradation. */}
				<label className="kd-mock-check">
					<input
						type="checkbox"
						checked={mock.licensed}
						disabled={!mock.enabled}
						onChange={(e) => applyMock({ licensed: e.target.checked })}
					/>
					credit licensing configured
				</label>
			</div>
			{/* The tier ladder is the INTEGRATOR's, not the kit's — edit it and reopen the panel.
			    `credits` is the TOTAL monthly credits (null = unlimited); `price` is per month. */}
			<label className="kd-recording-context">
				tiers (integrator-owned)
				<textarea
					value={creditPlans}
					rows={7}
					spellCheck={false}
					placeholder='[{ "tier": "TIER_1", "credits": 50, "price": 0 }]'
					onChange={(e) => onCreditPlansChange(e.target.value)}
				/>
			</label>
			{validPlansJson(creditPlans) ? null : (
				<p className="kd-alert" role="alert">
					tiers: not a JSON array
				</p>
			)}
			<div className="kd-btn-row">
				<button className="kd-btn" onClick={credits.openPanel}>
					Open usage panel
				</button>
				<button className="kd-btn" onClick={() => void credits.refresh()}>
					Refresh balance
				</button>
				<button className="kd-btn" onClick={credits.dismissAlert}>
					Dismiss banner
				</button>
			</div>
		</Section>
	)
}

export default CreditsTool
