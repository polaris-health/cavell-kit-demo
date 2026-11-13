/**
 * Harness-only stand-in for CareConnect's record navigation, so the GP's record-navigation skill
 * (backend `skills/frontend_skills_md/navigate_to.md`, active only when the host declares
 * `navigateTo`) and the kit's record citations (provider `onNavigateTo`) can be exercised without the
 * CareConnect app. There is no record to move, so the "screen" is the last accepted path — patient,
 * view and item — shown in the harness panel's Frontend tools section, and reported back by
 * `getCurrentView`.
 *
 * It takes the record path Cavell proposed to Corilus (R0: `patientId`, `view`, `resourceType`, `resourceId`;
 * docs/external/corilus/requests/2026-10-25-record-paths.md).
 *
 * Contract: docs/external/corilus/careconnect-gp-frontend-tool-contracts.md#navigateto
 * Codes:    docs/external/corilus/careconnect-gp-frontend-tools.md (appendix) — keep in sync by hand.
 */
import type { RecordPath } from '@cavell/kit'

export const NAVIGATION_TARGETS = [
	'DASHBOARD',
	'EPISODES',
	'PATIENT_DETAILS',
	'CONTACTS',
	'CARE_APPROACH',
	'DOCUMENTS',
	'LETTERS',
	'PRESCRIPTIONS',
	'ACTIVE_MEDICATION',
	'PARAMETERS',
	'LAB_RESULTS',
	'RISK_OVERVIEW',
	'ALLERGIES',
	'INTOLERANCES',
	'SOCIAL_RISKS',
	'OCCUPATIONAL_RISKS',
	'FAMILY_HISTORY',
	'SOCIAL_DATA',
	'TREATMENTS',
	'VACCINATIONS',
	'PLANNING',
	'CHAPTER_IV',
	'NOTES',
	'REIMBURSEMENT',
	'PREGNANCY',
	'ABSENCE_CERTIFICATES',
	'EXTERNAL_PLATFORM',
] as const

/** Null until the first navigation. */
let currentScreen: string | null = null

/** The proposed `getCurrentView` output (R1): every field `null` until the first navigation, as
 *  outside a patient record, and the item `null` when a screen opened without one. */
export type CurrentView = {
	patientId: string | null
	view: string | null
	resourceType: string | null
	resourceId: string | null
}

let currentView: CurrentView = { patientId: null, view: null, resourceType: null, resourceId: null }

const listeners = new Set<() => void>()

export const subscribeCurrentScreen = (listener: () => void) => {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

export const getCurrentScreen = (): string | null => currentScreen

export const getCurrentView = (): CurrentView => currentView

/** The host's responses, verbatim: the codes are matched exactly (upper case, no trimming), and
 *  a rejected view leaves the screen where it was. */
export const navigateTo = (
	view: string,
	resourceId?: string,
	patientId?: string,
	resourceType?: string,
): { success: true } | { success: false; error: string } => {
	if (!(NAVIGATION_TARGETS as readonly string[]).includes(view)) {
		return { success: false, error: `Unknown navigation target: ${view}` }
	}

	currentView = {
		patientId: patientId ?? null,
		view,
		resourceType: resourceType ?? null,
		resourceId: resourceId ?? null,
	}
	currentScreen = [patientId ? `patient ${patientId.slice(0, 8)}…` : null, view, resourceType, resourceId]
		.filter(Boolean)
		.join(' / ')
	for (const listener of listeners) {
		listener()
	}

	return { success: true }
}

/** The provider's `onNavigateTo`: a clicked record citation, as the kit hands it over. A real host maps
 *  it straight onto its own navigation — in CareConnect, `navigateTo` with the same values. */
export const navigateToRecord = (path: RecordPath): void => {
	const result = navigateTo(path.view, path.resourceId, path.patientId, path.resourceType)
	if (!result.success) {
		console.warn(`[kit-demo] record citation not opened: ${result.error}`)
	}
}
