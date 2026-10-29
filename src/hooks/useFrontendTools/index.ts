import { z } from 'zod'

import { useFrontendTool } from '@cavell/kit'

import { NAVIGATION_TARGETS, navigateTo } from '../../mocks/navigateTo'
import params from '../../params'
import mockMcpRecords from './mockMcpRecords'
import useCareConnectTools from './useCareConnectTools'

const patientScoped = z.object({ patient_resource_id: z.string() })

const useFrontendTools = () => {
	// Mocks of the CareConnect GP desktop app's own tools (letters, eForms, absence certificates…).
	// `?mock_careconnect=1`, and see the README.
	useCareConnectTools()

	useFrontendTool({
		name: 'get_practice_protocol',
		description:
			'Returns the practice-internal protocol for a topic. ALWAYS call this tool when the user asks ' +
			'about internal practice protocols — the assistant has no other access to them.',
		parameters: z.object({ topic: z.string().optional() }),
		handler: async () => ({ protocol: `Interne afspraak, referentie ${params.nonce}` }),
	})

	// No custom renderer for this one on purpose: it renders as the kit's own
	// ToolCallCard, which is where user-triggered toolCallbacks show their button.
	useFrontendTool({
		name: 'get_office_hours',
		description: 'Returns the practice office hours. Call this when the user asks about opening hours.',
		parameters: z.object({}),
		handler: async () => ({ hours: 'Mon-Fri 08:00-18:00' }),
	})

	// CareConnect's record navigation, mocked: declaring it is what turns on the GP's navigate_to
	// skill. The screen it "opens" shows in the harness panel. See src/mocks/navigateTo.ts.
	useFrontendTool({
		name: 'navigateTo',
		description:
			"Opens a screen in the user's open patient record, and optionally selects one item on it. " +
			'`target` must be one of the listed codes, exactly as written.',
		// A plain string, not an enum, so an unknown code reaches the handler and gets the host's error.
		// resourceType/resourceId/patientId mirror the item-level navigation proposed to Corilus (not live in CareConnect).
		parameters: z.object({
			target: z.string().describe(`One of: ${NAVIGATION_TARGETS.join(', ')}`),
			resourceType: z.string().optional().describe('Resource type of that item, e.g. Observation'),
			resourceId: z.string().optional().describe('Id of the record item to select on that screen'),
			patientId: z.string().optional().describe("The open patient's resource id"),
		}),
		handler: async ({ target, resourceType, resourceId, patientId }) =>
			navigateTo(target, resourceId, patientId, resourceType),
	})

	// Canned stand-ins for the record reads careconnect_gp v3 serves over Corilus' MCP gateway, so
	// their cards can be exercised with no gateway in reach. `?mock_mcp=1`, and see the README.
	const mockMcp = params.mockMcp

	useFrontendTool({
		name: 'get_allergies',
		description:
			"Get the patient's allergies and intolerances: substance, reaction, severity, criticality, " +
			'and whether they are still active or resolved.',
		parameters: patientScoped,
		available: mockMcp,
		handler: async () => mockMcpRecords.allergies,
	})

	useFrontendTool({
		name: 'get_family_history',
		description:
			'Get conditions recorded in the blood relatives of the patient, the relation, and the age ' +
			'at onset. About relatives, never about the patient themselves.',
		parameters: patientScoped,
		available: mockMcp,
		handler: async () => mockMcpRecords.familyHistory,
	})

	useFrontendTool({
		name: 'get_contact_persons',
		description:
			"Get the patient's contact persons: next of kin, emergency contact, guardian — who they " +
			'are and how to reach them.',
		parameters: patientScoped,
		available: mockMcp,
		handler: async () => mockMcpRecords.contactPersons,
	})

	useFrontendTool({
		name: 'get_consents',
		description:
			'Get the consents recorded for the patient: eHealth informed consent, the data sharing it ' +
			'covers, and the period it is valid for.',
		parameters: patientScoped,
		available: mockMcp,
		handler: async () => mockMcpRecords.consents,
	})
}

export default useFrontendTools
