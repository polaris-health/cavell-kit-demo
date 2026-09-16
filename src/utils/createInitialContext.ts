import params from '../params'
import parsePatientId from './parsePatientId'

/**
 * The host context handed to `CavellProvider` on mount. This is the context the kit boots with, so
 * it is what conversation preloading reads: the session-list scope (patient) and the auto-resume
 * match (problem) both come from the INIT-time context, not from a later declaration.
 *
 * `?context=` is the whole context verbatim, for exercising exactly that; the single-key params
 * (`?patient=`/`?patient_name=`/`?patient_gender=`/`?problem=`/`?specialty=`) are shorthand for the
 * keys the demo declares most, and `?context=` replaces them wholesale rather than merging — one
 * URL, one answer to "what did the kit boot with".
 */
const createInitialContext = (): Record<string, unknown> => {
	if (params.initialContext) {
		return { ...params.initialContext }
	}

	const context: Record<string, unknown> = {}
	if (params.patientId) {
		Object.assign(context, parsePatientId(params.patientId))
		if (params.patientName) {
			context.patient_name = params.patientName
		}
		if (params.patientGender) {
			context.patient_gender = params.patientGender
		}
	}
	if (params.problem) {
		context.problem = params.problem
	}
	if (params.specialty) {
		context.current_caregiver_speciality = params.specialty
	}

	return context
}

export default createInitialContext
