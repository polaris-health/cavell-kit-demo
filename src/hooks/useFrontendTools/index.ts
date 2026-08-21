import { z } from 'zod'

import { useFrontendTool } from '@cavell/kit'

import params from '../../params'

const useFrontendTools = () => {
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
}

export default useFrontendTools
