/**
 * Registers the CareConnect GP Companion's frontend tools as mocks (`?mock_careconnect=1`) plus the two
 * cards that need UI: the `gatherLetterInfo` recipient/template picker (human-in-the-loop, like the real
 * one it waits for Continue/Cancel) and a preview of the HTML `openSendLetterPopup` received. See mockCareConnect.ts.
 */
import { useState } from 'react'

import { z } from 'zod'

import { Button, Select, ToolCardShell, useFrontendTool, useHumanInTheLoop } from '@cavell/kit'

import params from '../../params'
import * as mockCareConnect from './mockCareConnect'

/** Every bridge parameter is a string, and an omitted one arrives as "" (contract: "Arguments"). */
const optionalString = z.string().optional()
const orEmpty = (value: string | undefined): string => value ?? ''

/** The contract's own input/output examples, appended to a description so the agent sees the exact shapes. */
const withExamples = (description: string, input: unknown, output: string): string =>
	`${description} Example input: ${JSON.stringify(input)}. Example output: ${output}`

const currentPatient = (): mockCareConnect.MockPatient => ({
	patient_resource_id: params.patientId ?? '3f2c9a1e-8b7d-4c11-9e0a-2b6f5d4c3a21',
	patient_name: params.patientName ?? 'Jan Peeters',
})

const LETTER_TEMPLATES = mockCareConnect.TEMPLATES.filter((template) => template.kind === 'LETTER')

const matchHint = <Item,>(items: Item[], hint: string | undefined, label: (item: Item) => string): Item | null => {
	const needle = (hint ?? '').trim().toLowerCase()
	if (!needle) {
		return null
	}

	return items.find((item) => label(item).toLowerCase().includes(needle)) ?? null
}

interface LetterInfoProps {
	args?: { recipientHint?: string; templateHint?: string }
	status: unknown
	result?: unknown
	respond?: (result: unknown) => Promise<void>
}

/** Built like any host card should be: the kit's `ToolCardShell` (the chrome of its own tool cards) around
 *  its `Select`s and `Button`s, so the picker reads as part of the panel. */
const LetterInfoCard = (props: LetterInfoProps) => {
	const { args, respond } = props

	const [receiverId, setReceiverId] = useState<string>(() =>
		String(matchHint(mockCareConnect.RECEIVERS, args?.recipientHint, mockCareConnect.receiverLabel)?.id ?? ''),
	)
	const [templateId, setTemplateId] = useState<string>(() =>
		String(matchHint(LETTER_TEMPLATES, args?.templateHint, (template) => template.title)?.id ?? ''),
	)

	if (!respond) {
		return (
			<ToolCardShell
				icon="envelope"
				title="Letter recipient and template chosen"
				headerEnd={<span className="kd-cc-badge">CareConnect mock</span>}
			/>
		)
	}

	return (
		<ToolCardShell
			icon="envelope"
			title="Who is the letter for, and on which template?"
			headerEnd={<span className="kd-cc-badge">CareConnect mock</span>}
			ariaLabel="gather letter info"
			actions={
				<>
					<Button
						onClick={() =>
							respond(
								mockCareConnect.gatherLetterInfoResult(
									mockCareConnect.RECEIVERS.find((receiver) => String(receiver.id) === receiverId) ??
										null,
									LETTER_TEMPLATES.find((template) => String(template.id) === templateId) ?? null,
								),
							)
						}
					>
						Continue
					</Button>
					<Button variant="secondary" onClick={() => respond(mockCareConnect.GATHER_LETTER_INFO_CANCELLED)}>
						Cancel
					</Button>
				</>
			}
		>
			<div className="kd-cc-field">
				Recipient
				<Select
					ariaLabel="Recipient"
					value={receiverId}
					onChange={setReceiverId}
					options={[
						{ value: '', label: '— none —' },
						...mockCareConnect.RECEIVERS.map((receiver) => ({
							value: String(receiver.id),
							label: `${mockCareConnect.receiverLabel(receiver)}${receiver.canReceive ? '' : ' (cannot receive)'}`,
						})),
					]}
				/>
			</div>
			<div className="kd-cc-field">
				Template
				<Select
					ariaLabel="Template"
					value={templateId}
					onChange={setTemplateId}
					options={[
						{ value: '', label: '— none —' },
						...LETTER_TEMPLATES.map((template) => ({
							value: String(template.id),
							label: `${template.title} (${template.language})`,
						})),
					]}
				/>
			</div>
		</ToolCardShell>
	)
}

interface LetterPreviewProps {
	args?: { recipientJson?: string; content?: string }
	status: unknown
}

const parseRecipients = (recipientJson: string | undefined): mockCareConnect.MockReceiver[] => {
	try {
		const parsed: unknown = JSON.parse(recipientJson ?? '')

		return Array.isArray(parsed) ? (parsed as mockCareConnect.MockReceiver[]) : []
	} catch {
		return []
	}
}

const LetterPreviewCard = (props: LetterPreviewProps) => {
	const { args } = props

	const recipients = parseRecipients(args?.recipientJson)
	const content = args?.content ?? ''
	// The agent keeps `@{NAME}` / `@{@{Naam}}` merge fields for CareConnect to fill (Corilus R15); the mock lists them.
	const mergeFields = [...new Set([...content.matchAll(/@\{(?:@\{)?([^{}]+)\}\}?/g)].map((match) => match[1]))]

	return (
		<ToolCardShell
			icon="file-lines"
			title="Letter opened in the editor"
			headerEnd={<span className="kd-cc-badge">CareConnect mock</span>}
			ariaLabel="letter editor (mock)"
		>
			<div className="kd-cc-meta">
				To:{' '}
				{recipients.length > 0
					? recipients.map(mockCareConnect.receiverLabel).join('; ')
					: '(no AI-chosen recipient)'}
			</div>
			{mergeFields.length > 0 ? (
				<div className="kd-cc-warn">Merge fields for CareConnect to fill: {mergeFields.join(', ')}</div>
			) : null}
			{/* The HTML is our own agent's output rendered in a demo page, not third-party content. */}
			<div className="kd-cc-letter" dangerouslySetInnerHTML={{ __html: content }} />
		</ToolCardShell>
	)
}

const useCareConnectTools = () => {
	const available = params.mockCareConnect

	useFrontendTool({
		name: 'onGetPatient',
		description: withExamples(
			"The currently open patient's resource id and name. Both empty when no patient is open.",
			{},
			'{"patient_resource_id": "3f2c9a1e-8b7d-4c11-9e0a-2b6f5d4c3a21", "patient_name": "Jan Peeters"}',
		),
		parameters: z.object({}),
		available,
		handler: async () => mockCareConnect.onGetPatient(currentPatient()),
	})

	useFrontendTool({
		name: 'getContactContext',
		description: withExamples(
			'SOEP content (reasons, observations, diagnosis, plannings, treatments) of every subcontact in the ' +
				'currently open consultation. Returns {open: false} if no consultation is open.',
			{},
			'{"open": true, "contact": {"actionDate": "2026-10-06T07:45:00Z", "subContacts": [{"title": "Consultatie", ' +
				'"type": "SOEP", "reason": [], "subjective": [{"freeTextContent": "Hoest sinds 5 dagen", "ibuiCode": null, ' +
				'"icpc2Code": null, "icd10Code": null, "additionalInformation": ""}], "objective": [], "evaluation": ' +
				'[{"freeTextContent": "Acute bronchitis", "ibuiCode": "10012345", "icpc2Code": "R78", "icd10Code": "J20.9", ' +
				'"additionalInformation": ""}], "planning": [], "treatmentNotes": [], "treatments": [{"freeTextContent": ' +
				'"Kinesitherapie", "additional": "2x per week"}]}]}}',
		),
		parameters: z.object({}),
		available,
		handler: async () => mockCareConnect.getContactContext(),
	})

	useFrontendTool({
		name: 'createContact',
		description: withExamples(
			'Open the create-consultation screen. Reopens the current consultation if one is already open.',
			{},
			'{"success": true}',
		),
		parameters: z.object({}),
		available,
		handler: async () => mockCareConnect.createContact(),
	})

	useFrontendTool({
		name: 'createPrefilledAbsenceCertificate',
		description: withExamples(
			'Request the absence certificate screen, prefilled. All parameters optional; dates yyyy-MM-dd; ' +
				'periodType FIRST/EXTENSION/RELAPSE; dayPart BEFORE_NOON/AFTERNOON/ENTIRE_DAY; reason ACCIDENT/ILLNESS/' +
				'FAMILY/PREGNANCY/BREASTFEEDING/CONSULT/WORK_ACCIDENT/OTHER/HOSPITALISATION/OCCUPATIONALDISEASE/' +
				'TRAVELTOFROMWORKACCIDENT; homeLeave true/false; inabilityPercentage 1-100; inhibitions comma-separated ' +
				'from WORK,SWIM,FOLLOW_LESSONS,SPORT,TRAVEL,VOTE,DAYCARE. Only set reason, reasonValue, extraInformation ' +
				'or inabilityPercentage when the doctor explicitly stated them.',
			{
				dateFrom: '2026-10-06',
				dateTo: '2026-10-10',
				periodType: 'FIRST',
				dayPart: 'ENTIRE_DAY',
				reason: 'ILLNESS',
				homeLeave: 'true',
				inabilityPercentage: '150',
				inhibitions: 'WORK,SPORT',
			},
			'{"status": "requested", "confirmed": false, "note": "...", "rejected": ["inabilityPercentage: \'150\' is ' +
				'out of range (1-100)"], "validationBlockers": []}',
		),
		parameters: z.object({
			dateFrom: optionalString,
			dateTo: optionalString,
			periodType: optionalString,
			dayPart: optionalString,
			reason: optionalString,
			reasonValue: optionalString,
			reasonDate: optionalString,
			reasonDate2: optionalString,
			homeLeave: optionalString,
			inabilityPercentage: optionalString,
			extraInformation: optionalString,
			consultationAt: optionalString,
			inhibitions: optionalString,
		}),
		available,
		handler: async (args) => mockCareConnect.createPrefilledAbsenceCertificate(args),
	})

	useFrontendTool({
		name: 'openEform',
		description: withExamples(
			'Request a specific eForm to open. eformName is the exact id of an EFORM entry returned by ' +
				'search_document_templates.',
			{ eformName: '901' },
			'{"status": "requested", "confirmed": false, "note": "..."}',
		),
		parameters: z.object({ eformName: z.string() }),
		available,
		handler: async ({ eformName }) => mockCareConnect.openEform(eformName),
	})

	useFrontendTool({
		name: 'discoverEFormFields',
		description: withExamples(
			'List the fields of the eForm currently open on screen: key, label, kind, required, writable, filled, ' +
				'value, options. Call before fillEFormFields; keys are only valid until the next call.',
			{},
			'{"formTitle": "Aanvraag kinesitherapie", "frameCount": 2, "fieldCount": 4, "truncated": false, "fields": ' +
				'[{"key": "0:patientName", "label": "Naam patiënt", "kind": "text", "required": true, "writable": false, ' +
				'"filled": true, "value": null, "options": []}, {"key": "1:diagnosis", "label": "Diagnose", "kind": ' +
				'"textarea", "required": true, "writable": true, "filled": false, "value": "", "options": []}, {"key": ' +
				'"1:sessions", "label": "Aantal sessies", "kind": "select", "required": false, "writable": true, "filled": ' +
				'false, "value": "", "options": ["|-- kies --", "9|9 sessies", "18|18 sessies"]}, {"key": "1:urgent", ' +
				'"label": "Dringend", "kind": "checkbox", "required": false, "writable": true, "filled": false, "value": ' +
				'"on", "options": []}]}, or {"status": "no_eform_open", "note": "Ask the doctor to open the eForm first."}',
		),
		parameters: z.object({}),
		available,
		handler: async () => mockCareConnect.discoverEFormFields(),
	})

	useFrontendTool({
		name: 'fillEFormFields',
		description: withExamples(
			'Type values into the visible eForm. fields is a JSON array string of {key, value} (text/select/date/' +
				'number) or {key, checked} (checkbox/radio), max 40 entries. Never overwrites a field already filled. ' +
				'Never saves, signs or sends the form.',
			{
				fields: '[{"key": "1:diagnosis", "value": "Lage rugpijn"}, {"key": "1:sessions", "value": "18"}, {"key": "1:urgent", "checked": true}]',
			},
			'{"filled": ["1:diagnosis", "1:sessions", "1:urgent"], "skipped": [{"key": "1:doesNotExist", "reason": ' +
				'"unknown field key — call discoverEFormFields again"}], "after": {"formTitle": "...", "frameCount": 2, ' +
				'"fieldCount": 4, "truncated": false, "fields": []}, "limitReached": false}',
		),
		parameters: z.object({ fields: z.string() }),
		available,
		handler: async ({ fields }) => mockCareConnect.fillEFormFields(fields),
	})

	useFrontendTool({
		name: 'getPatientGuidelines',
		description: withExamples(
			'Links to the patient guideline leaflets for an ICD10 diagnosis code, such as the icd10Code of a coded ' +
				'evaluation line from getContactContext. Links only, never the leaflet content.',
			{ icd10Code: 'J20.9', language: 'NL' },
			'{"guidelines": [{"title": "Acute bronchitis", "url": "https://..."}], "skippedWithoutUrl": 0}',
		),
		parameters: z.object({ icd10Code: z.string(), language: optionalString }),
		available,
		handler: async ({ icd10Code }) => mockCareConnect.getPatientGuidelines(icd10Code),
	})

	useHumanInTheLoop({
		name: 'gatherLetterInfo',
		description: withExamples(
			'Open the recipient/template picker for a letter; the doctor picks there. Returns {status: "ready", ' +
				'receivers: [...], template?: {id, title}} or {status: "cancelled"}. Pass receivers as a JSON array ' +
				'string to openSendLetterPopup as recipientJson.',
			{ recipientHint: 'Peeters', templateHint: 'Verwijsbrief cardiologie' },
			'{"status": "ready", "receivers": [{"id": 4711, "firstName": "Jan", "lastName": "Peeters", ' +
				'"institutionName": null, "resolvedSpeciality": "Cardiologie", "freeTextSpeciality": null, ' +
				'"identifierType": "NIHII", "identifier": "12345678901", "canReceive": true, "contactPerson": false, ' +
				'"municipality": "Kortrijk", "zip": "8500"}], "template": {"id": 482, "title": "Verwijsbrief cardiologie"}}',
		),
		parameters: z.object({ recipientHint: optionalString, templateHint: optionalString }),
		available,
		render: (renderProps: LetterInfoProps) => <LetterInfoCard {...renderProps} />,
	})

	useFrontendTool({
		name: 'openSendLetterPopup',
		description: withExamples(
			'Open the letter editor, prefilled, for the doctor to review and send. recipientJson is the receivers ' +
				'array from gatherLetterInfo as a JSON string; content is the full letter body as HTML (build it from ' +
				'the template body fetched with search_document_templates, never from its title alone).',
			{
				recipientJson: '[{"id": 4711, "firstName": "Jan", "lastName": "Peeters", "...": "..."}]',
				content: '<p>Geachte collega Jan Peeters,</p><p>Graag verwijs ik u ...</p>',
			},
			'{"status": "requested", "confirmed": false, "note": "..."}',
		),
		parameters: z.object({ recipientJson: optionalString, content: optionalString }),
		available,
		handler: async ({ recipientJson }) => mockCareConnect.openSendLetterPopup(orEmpty(recipientJson)),
		render: (renderProps: LetterPreviewProps) => <LetterPreviewCard {...renderProps} />,
	})
}

export default useCareConnectTools
