/** A numeric id is the legacy emr spelling (patient_id); anything else is a resource UUID. */
const parsePatientId = (id: string): Record<string, unknown> =>
	/^\d+$/.test(id) ? { patient_id: Number(id) } : { patient_resource_id: id }

export default parsePatientId
