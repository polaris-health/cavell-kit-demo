/** The harness panel's "recording context" JSON → the FHIR resource array `recording.getContext`
 *  returns. Lenient on purpose (a half-typed draft must not break a recording start): anything
 *  that is not a JSON array parses as no context. */
const parseRecordingContext = (raw: string): unknown[] => {
	try {
		const parsed: unknown = JSON.parse(raw)

		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export default parseRecordingContext
