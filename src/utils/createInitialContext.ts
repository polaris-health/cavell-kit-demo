import params from '../params'

const createInitialContext = (): Record<string, unknown> => {
	const context: Record<string, unknown> = {}
	if (params.patientId) {
		Object.assign(context, patientIdField(params.patientId))
		if (params.patientName) {
			context.patient_name = params.patientName
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

/** A numeric id is the legacy emr spelling (patient_id); anything else is a resource UUID. */
const patientIdField = (id: string): Record<string, unknown> =>
	/^\d+$/.test(id) ? { patient_id: Number(id) } : { patient_resource_id: id }

export default createInitialContext
