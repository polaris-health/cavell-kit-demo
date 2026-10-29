/**
 * Stand-ins for the CareConnect GP Companion's frontend tools (`local_patches/careconnect-gp-frontend-tools.md`
 * + `…-tool-contracts.md`, v1.3): same names, string parameters and result shapes, canned data. `?mock_careconnect=1`.
 *
 * Results are JSON *strings* or the contract's plain-text failures, exactly like the desktop bridge (the kit
 * passes string results through). Template bodies are NOT mocked: the backend reads them from the practice
 * catalogue over Corilus' MCP gateway (`get_letter_template`), so the letter and eForm ids below are real
 * ACC catalogue ids (verified 2026-10-27) — a mock id would come back "Template not found".
 */

export interface MockPatient {
	patient_resource_id: string
	patient_name: string
}

const uncodedLine = (freeTextContent: string) => ({
	freeTextContent,
	ibuiCode: null,
	icpc2Code: null,
	icd10Code: null,
	additionalInformation: '',
})

/** One SOEP sub-contact in the contract's exact shape: six lists + treatments, always present. */
const DUMMY_CONTACT = {
	actionDate: '2026-10-06T07:45:00Z',
	subContacts: [
		{
			title: 'Consultatie',
			type: 'SOEP',
			reason: [{ ...uncodedLine('Hartkloppingen sinds 3 weken'), icpc2Code: 'K04' }],
			subjective: [
				uncodedLine(
					'Episodes van hartkloppingen, vooral in rust en ’s avonds, duur 5-10 minuten. Geen syncope, ' +
						'geen thoracale pijn. Drinkt 4 koppen koffie per dag.',
				),
			],
			objective: [
				uncodedLine('BD 152/94 mmHg, pols 88/min regelmatig. Auscultatie hart en longen normaal. BMI 29.'),
			],
			evaluation: [
				{
					freeTextContent: 'Palpitaties, hypertensie onvoldoende gecontroleerd',
					ibuiCode: '10004219',
					icpc2Code: 'K86',
					icd10Code: 'I10',
					additionalInformation: '',
				},
			],
			planning: [uncodedLine('Verwijzing cardiologie voor Holter en echocardiografie. Cafeïne beperken.')],
			treatmentNotes: [],
			treatments: [{ freeTextContent: 'Amlodipine 5 mg', additional: '1x per dag, ’s ochtends' }],
		},
	],
}

export interface MockReceiver {
	id: number
	firstName: string | null
	lastName: string | null
	institutionName: string | null
	resolvedSpeciality: string | null
	freeTextSpeciality: string | null
	identifierType: string
	identifier: string
	canReceive: boolean
	contactPerson: boolean
	municipality: string
	zip: string
}

export const RECEIVERS: MockReceiver[] = [
	{
		id: 4711,
		firstName: 'Jan',
		lastName: 'Peeters',
		institutionName: null,
		resolvedSpeciality: 'Cardiologie',
		freeTextSpeciality: null,
		identifierType: 'NIHII',
		identifier: '12345678901',
		canReceive: true,
		contactPerson: false,
		municipality: 'Kortrijk',
		zip: '8500',
	},
	{
		id: 4712,
		firstName: 'Sofie',
		lastName: 'Claes',
		institutionName: null,
		resolvedSpeciality: 'Dermatologie',
		freeTextSpeciality: null,
		identifierType: 'NIHII',
		identifier: '23456789012',
		canReceive: true,
		contactPerson: false,
		municipality: 'Gent',
		zip: '9000',
	},
	{
		id: 4713,
		firstName: null,
		lastName: null,
		institutionName: 'AZ Groeninge – Dienst Radiologie',
		resolvedSpeciality: 'Radiologie',
		freeTextSpeciality: null,
		identifierType: 'NIHII',
		identifier: '71012345',
		canReceive: true,
		contactPerson: false,
		municipality: 'Kortrijk',
		zip: '8500',
	},
	{
		id: 4714,
		firstName: 'Pieter',
		lastName: 'Maes',
		institutionName: null,
		resolvedSpeciality: null,
		freeTextSpeciality: 'Kinesitherapeut',
		identifierType: 'NIHII',
		identifier: '54321098765',
		canReceive: false,
		contactPerson: false,
		municipality: 'Harelbeke',
		zip: '8530',
	},
]

const receiverName = (receiver: MockReceiver): string =>
	receiver.institutionName ?? `${receiver.firstName ?? ''} ${receiver.lastName ?? ''}`.trim()

export const receiverLabel = (receiver: MockReceiver): string =>
	`${receiverName(receiver)} · ${receiver.resolvedSpeciality ?? receiver.freeTextSpeciality ?? '—'}`

export interface MockTemplate {
	id: number
	title: string
	kind: 'LETTER'
	language: 'NL' | 'FR'
}

/** The letter templates the card offers: real ACC catalogue entries, so the backend can read their bodies. */
export const TEMPLATES: MockTemplate[] = [
	{ id: 216, title: 'Verwijsbrief', kind: 'LETTER', language: 'NL' },
	{ id: 220, title: 'Verwijsbrief oftalmoloog voor zorgtraject diabetes type II', kind: 'LETTER', language: 'NL' },
	{
		id: 227,
		title: 'Verwijsbrief nefroloog voor zorgtraject chronische nierinsufficiëntie',
		kind: 'LETTER',
		language: 'NL',
	},
]

type EformFieldKind = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'unknown'

interface MockEformField {
	key: string
	label: string
	kind: EformFieldKind
	required: boolean
	writable: boolean
	filled: boolean
	value: string | null
	options: string[]
}

interface MockEform {
	formTitle: string
	frameCount: number
	fields: MockEformField[]
}

const readOnlyField = (key: string, label: string, kind: EformFieldKind): MockEformField => ({
	key,
	label,
	kind,
	required: true,
	writable: false,
	filled: true,
	value: null,
	options: [],
})

const writableField = (
	key: string,
	label: string,
	kind: EformFieldKind,
	required = false,
	options: string[] = [],
): MockEformField => ({
	key,
	label,
	kind,
	required,
	writable: true,
	filled: false,
	// Checkboxes and radios report their value attribute, not whether they are ticked (contract).
	value: kind === 'checkbox' ? 'on' : kind === 'radio' ? key.split(':')[1].toUpperCase() : '',
	options,
})

/** Fresh copies per openEform — the fill tools mutate the open form in place. Keyed by real ACC eForm ids
 *  (what `list_letter_templates` returns); the fields are our stand-in, the real forms come from HealthConnect. */
const EFORMS: Record<string, (() => MockEform) | undefined> = {
	'PHYSIO-PRESCRIPTION': () => ({
		formTitle: 'Kinesitherapievoorschrift',
		frameCount: 2,
		fields: [
			readOnlyField('0:patientName', 'Naam patiënt', 'text'),
			readOnlyField('0:birthDate', 'Geboortedatum', 'date'),
			writableField('1:diagnosis', 'Diagnose', 'textarea', true),
			writableField('1:startDate', 'Startdatum behandeling', 'date'),
			writableField('1:sessions', 'Aantal sessies', 'select', false, [
				'|-- kies --',
				'9|9 sessies',
				'18|18 sessies',
				'60|60 sessies',
			]),
			writableField('1:frequency', 'Frequentie per week', 'number'),
			writableField('1:urgent', 'Dringend', 'checkbox'),
			writableField('1:homeVisit', 'Behandeling aan huis', 'checkbox'),
			writableField('1:remarks', 'Opmerkingen voor de kinesitherapeut', 'textarea'),
		],
	}),
	'MEDICAL-IMAGING': () => ({
		formTitle: 'Medische beeldvorming',
		frameCount: 1,
		fields: [
			readOnlyField('0:patientName', 'Naam patiënt', 'text'),
			writableField('0:clinicalInfo', 'Klinische inlichtingen', 'textarea', true),
			writableField('0:question', 'Diagnostische vraagstelling', 'textarea', true),
			writableField('0:rx', 'RX', 'radio'),
			writableField('0:echo', 'Echografie', 'radio'),
			writableField('0:ct', 'CT', 'radio'),
			writableField('0:mri', 'MRI', 'radio'),
			writableField('0:region', 'Regio', 'text', true),
			writableField('0:pregnant', 'Zwangerschap mogelijk', 'checkbox'),
			writableField('0:contrastAllergy', 'Gekende contrastallergie', 'checkbox'),
		],
	}),
}

const FILL_LIMIT = 40

/** What the desktop app would be showing. Module-level on purpose: a page reload is the mock's "log in again". */
const screen: { contactOpen: boolean; eform: MockEform | null } = { contactOpen: false, eform: null }

const json = (value: unknown): string => JSON.stringify(value)
const requested = (note: string): string => json({ status: 'requested', confirmed: false, note })

export const onGetPatient = (patient: MockPatient): string => json(patient)

export const getContactContext = (): string =>
	screen.contactOpen ? json({ open: true, contact: DUMMY_CONTACT }) : json({ open: false })

export const createContact = (): string => {
	screen.contactOpen = true

	return json({ success: true })
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ABSENCE_ENUMS: Record<string, string[]> = {
	periodType: ['FIRST', 'EXTENSION', 'RELAPSE'],
	dayPart: ['BEFORE_NOON', 'AFTERNOON', 'ENTIRE_DAY'],
	reason: [
		'ACCIDENT',
		'ILLNESS',
		'FAMILY',
		'PREGNANCY',
		'BREASTFEEDING',
		'CONSULT',
		'WORK_ACCIDENT',
		'OTHER',
		'HOSPITALISATION',
		'OCCUPATIONALDISEASE',
		'TRAVELTOFROMWORKACCIDENT',
	],
	homeLeave: ['TRUE', 'FALSE'],
}
const INHIBITIONS = ['WORK', 'SWIM', 'FOLLOW_LESSONS', 'SPORT', 'TRAVEL', 'VOTE', 'DAYCARE']

export type AbsenceCertificateArgs = Partial<Record<string, string>>

/** Validates what the contract's table says and reports it the contract's way: `rejected` per field,
 *  `validationBlockers` for the pregnancy date rule. */
export const createPrefilledAbsenceCertificate = (args: AbsenceCertificateArgs): string => {
	const rejected: string[] = []
	const accepted: Record<string, string> = {}
	const given = (name: string): string => (args[name] ?? '').trim()

	for (const name of ['dateFrom', 'dateTo', 'reasonDate', 'reasonDate2']) {
		const value = given(name)
		if (!value) {
			continue
		}
		if (DATE_RE.test(value)) {
			accepted[name] = value
		} else {
			rejected.push(`${name}: could not parse date '${value}' (expected yyyy-MM-dd)`)
		}
	}
	for (const [name, allowed] of Object.entries(ABSENCE_ENUMS)) {
		const value = given(name)
		if (!value) {
			continue
		}
		if (allowed.includes(value.toUpperCase())) {
			accepted[name] = value.toUpperCase()
		} else {
			rejected.push(`${name}: unknown value '${value}'`)
		}
	}
	const percentage = given('inabilityPercentage')
	if (percentage) {
		if (/^\d+$/.test(percentage) && Number(percentage) >= 1 && Number(percentage) <= 100) {
			accepted.inabilityPercentage = percentage
		} else {
			rejected.push(`inabilityPercentage: '${percentage}' is out of range (1-100)`)
		}
	}
	const inhibitions = given('inhibitions')
	if (inhibitions) {
		const parts = inhibitions.split(',').map((part) => part.trim().toUpperCase())
		const unknown = parts.filter((part) => !INHIBITIONS.includes(part))
		if (unknown.length === 0) {
			accepted.inhibitions = parts.join(',')
		} else {
			rejected.push(`inhibitions: unknown value '${unknown.join(',')}'`)
		}
	}

	const validationBlockers: string[] = []
	if (accepted.reason === 'PREGNANCY') {
		if (!accepted.reasonDate || !accepted.reasonDate2) {
			validationBlockers.push(
				'Pregnancy certificate needs both the expected delivery date and the start of maternity leave',
			)
		} else if (
			new Date(accepted.reasonDate).getTime() - new Date(accepted.reasonDate2).getTime() <=
			7 * 86_400_000
		) {
			validationBlockers.push('Maternity leave must start more than 7 days before the expected delivery date')
		}
	}

	return json({
		status: 'requested',
		confirmed: false,
		note:
			'The absence certificate screen was requested with the accepted values. Fields left empty keep the ' +
			'screen defaults. Ask the doctor to check and save.',
		rejected,
		validationBlockers,
	})
}

export const openEform = (eformName: string): string => {
	const factory = EFORMS[eformName.trim()]
	// Unknown id: the real app opens the generic document picker and still answers "requested".
	screen.eform = factory ? factory() : null

	return requested(
		factory
			? 'The eForm screen was requested. Ask the doctor whether it opened before discovering its fields.'
			: 'The eForm id was not recognised; the generic document picker opened instead. Ask the doctor.',
	)
}

const snapshot = (form: MockEform) => ({
	formTitle: form.formTitle,
	frameCount: form.frameCount,
	fieldCount: form.fields.length,
	truncated: false,
	fields: form.fields.map((field) => ({ ...field })),
})

const NO_EFORM = json({ status: 'no_eform_open', note: 'Ask the doctor to open the eForm first.' })

export const discoverEFormFields = (): string => (screen.eform ? json(snapshot(screen.eform)) : NO_EFORM)

interface FillEntry {
	key?: unknown
	value?: unknown
	checked?: unknown
}

const parseFillEntries = (fieldsJson: string): FillEntry[] | null => {
	try {
		const parsed: unknown = JSON.parse(fieldsJson)

		return Array.isArray(parsed) ? (parsed as FillEntry[]) : null
	} catch {
		return null
	}
}

/** Writes one value the way the contract says the screen would; returns whether the field ended up filled. */
const writeField = (field: MockEformField, entry: FillEntry): boolean => {
	if (field.kind === 'checkbox' || field.kind === 'radio') {
		field.filled = entry.checked === true || entry.checked === 'true'

		return field.filled
	}
	const value = String(entry.value ?? '')
	if (field.kind === 'select') {
		// Exact match on the option value, then case-insensitive on its text; no match → in neither list.
		const option = field.options
			.map((entryText) => entryText.split('|'))
			.find(([optionValue, text]) => optionValue === value || (text ?? '').toLowerCase() === value.toLowerCase())
		if (!option || option[0] === '') {
			return false
		}
		field.value = option[0]
	} else if (field.kind === 'date') {
		if (!DATE_RE.test(value)) {
			return false
		}
		field.value = value
	} else if (field.kind === 'number') {
		if (!/^-?\d+(\.\d+)?$/.test(value)) {
			return false
		}
		field.value = value
	} else {
		field.value = value
	}
	field.filled = field.value !== ''

	return field.filled
}

export const fillEFormFields = (fieldsJson: string): string => {
	const form = screen.eform
	if (!form) {
		return NO_EFORM
	}
	const entries = parseFillEntries(fieldsJson)
	if (!entries) {
		return json({ status: 'error', reason: 'fields must be a JSON array of {key, value|checked} objects.' })
	}

	const filled: string[] = []
	const skipped: Array<{ key: string; reason: string }> = []
	let writableSeen = 0
	let limitReached = false

	for (const entry of entries) {
		if (typeof entry?.key !== 'string') {
			continue
		}
		const field = form.fields.find((candidate) => candidate.key === entry.key)
		if (!field) {
			skipped.push({ key: entry.key, reason: 'unknown field key — call discoverEFormFields again' })
			continue
		}
		if (!field.writable) {
			skipped.push({ key: entry.key, reason: 'field is not writable' })
			continue
		}
		if (field.filled) {
			skipped.push({ key: entry.key, reason: 'already filled by the doctor — not overwritten' })
			continue
		}
		writableSeen += 1
		if (writableSeen > FILL_LIMIT) {
			limitReached = true
			skipped.push({ key: entry.key, reason: 'limit of 40 fields per call reached' })
			continue
		}
		if (writeField(field, entry)) {
			filled.push(field.key)
		}
	}

	return json({ filled, skipped, after: snapshot(form), limitReached })
}

export const gatherLetterInfoResult = (receiver: MockReceiver | null, template: MockTemplate | null): string =>
	json({
		status: 'ready',
		receivers: receiver ? [receiver] : [],
		...(template ? { template: { id: template.id, title: template.title } } : {}),
	})

export const GATHER_LETTER_INFO_CANCELLED = json({ status: 'cancelled' })

export const openSendLetterPopup = (recipientJson: string): string => {
	const recipientsReadable = parseFillEntries(recipientJson) !== null

	return requested(
		recipientsReadable
			? 'The letter editor was requested with the content and recipients. The doctor reviews and sends it; nothing is sent yet.'
			: 'The letter editor was requested, but recipientJson could not be read as an array, so the letter opened without AI-chosen recipients.',
	)
}

/* getPatientGuidelines (feature-gated "Use Case 4: Post-consultation note"): links only, per the contract. The
 * URLs are placeholders — the demo ships publicly and must not pose as a real leaflet source. */
const LEAFLETS: Record<string, { title: string; url: string }[]> = {
	I10: [{ title: 'Hoge bloeddruk', url: 'https://example.org/leaflets/hoge-bloeddruk' }],
	J20: [{ title: 'Acute bronchitis', url: 'https://example.org/leaflets/acute-bronchitis' }],
}

export const getPatientGuidelines = (icd10Code: string): string => {
	const code = icd10Code.trim().toUpperCase()
	if (!code) {
		return json({ guidelines: [], note: 'No ICD10 code given.' })
	}

	const guidelines = LEAFLETS[code] ?? LEAFLETS[code.split('.')[0]] ?? []

	return json({ guidelines, skippedWithoutUrl: 0 })
}
