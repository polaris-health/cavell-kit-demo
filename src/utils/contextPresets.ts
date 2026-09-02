/**
 * Standard boot-context sets for the config panel's preset picker: one click fills the
 * "initial context" box (and the locale field) instead of hand-typing the JSON. Picking a
 * preset only AUTHORS the drafts — "reload with config" still applies them, and the box
 * stays editable for one-off tweaks.
 *
 * All sets are built from the CareConnect acceptance fixtures the backend suites use
 * (patient resource id + IBUI problem code), with host-declared display fields
 * (`patient_name`/`patient_gender` — first-class context elements) and the caregiver
 * specialty spelled the way the backend expects (`current_caregiver_speciality`).
 */

export interface ContextPreset {
	key: string
	/** Visible option text — part of the demo's E2E contract, keep stable. */
	label: string
	/** Fills the top-level `?locale=` param (the kit's `locale` prop), not a context key. */
	locale?: string
	context: Record<string, unknown>
}

const PATIENT = {
	patient_resource_id: '2b94a6aa-d181-4da4-9b14-74a1dee33327',
	patient_name: 'Anthony Rathé',
	patient_gender: 'male',
}

const PROBLEM = { problem: '10092206' }

const SPECIALIST_CAREGIVER = { current_caregiver_speciality: 'diabetes specialist' }

const CONTEXT_PRESETS: ContextPreset[] = [
	{
		key: 'patient',
		label: 'patient (nl)',
		locale: 'nl',
		context: { ...PATIENT },
	},
	{
		key: 'patient-problem',
		label: 'patient + problem (nl)',
		locale: 'nl',
		context: { ...PATIENT, ...PROBLEM },
	},
	{
		key: 'specialist-consult',
		label: 'specialist consult (nl)',
		locale: 'nl',
		context: { ...PATIENT, ...PROBLEM, ...SPECIALIST_CAREGIVER },
	},
	{
		key: 'specialist-caregiver',
		label: 'specialist caregiver, no patient (nl)',
		locale: 'nl',
		context: { ...SPECIALIST_CAREGIVER },
	},
]

export default CONTEXT_PRESETS
