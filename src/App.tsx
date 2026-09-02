/**
 * Kit demo host — the reference embedding of @cavell/kit for the browser E2E
 * (local_tests/integration_tests/corilus_app/cavell_kit_e2e_test.py +
 * cavell_kit_generic_agent_test.py) and for manual exploration
 * (`yarn workspace cavell-kit-demo dev`).
 *
 * Renders the full CavellAssistant surface AND a harness control panel that
 * covers the public API surface (useCavellCompanion, useFrontendTool,
 * useHumanInTheLoop, useInterrupt, custom renderToolCalls, toolCallbacks,
 * window controls, capabilities/runUrl targeting, host context editing).
 *
 * E2E contract: the suites carry no test-only hooks — they locate everything the way a user
 * does, so what must stay stable is USER-VISIBLE: the harness section titles ("Session",
 * "Capabilities", "Host context", "Recording", "History", "Events"), button and input labels, the
 * `label: yes|no` state chips, and the tool-callback feed entry headers
 * (`name:status[:source]`). Renaming any of those is an E2E-affecting change; styling is free.
 *
 * All configuration arrives as URL params, parsed once in `src/params/` and
 * documented in README.md.
 */
import { useState } from 'react'

import { z } from 'zod'

import {
	CavellProvider,
	ReactToolCallRenderer,
	type ToolCallback,
	type ToolCallbackEvent,
	defineCavellToolCard,
	defineToolCallRenderer,
} from '@cavell/kit'

import Companion from './components/Companion'
import TokenForm from './components/TokenForm'
import Tooling from './components/Tooling'
import params from './params'
import createInitialContext from './utils/createInitialContext'
import parseRecordingContext from './utils/parseRecordingContext'

const App = () => {
	const [context, setContext] = useState(createInitialContext())

	const [errorLog, setErrorLog] = useState<string[]>([])
	const [windowControlsLog, setWindowControlsLog] = useState<string[]>([])
	const [autoEvents, setAutoEvents] = useState<ToolCallbackEvent[]>([])
	const [userEvents, setUserEvents] = useState<ToolCallbackEvent[]>([])
	const [recordingLog, setRecordingLog] = useState<string[]>([])
	const [difficultWords, setDifficultWords] = useState('')
	const [recordingContext, setRecordingContext] = useState('[{ "resourceType": "Patient", "gender": "unknown" }]')

	if (!params.token) {
		return <TokenForm />
	}

	// Auto fires on live completions only (replay must not re-fire — ADR 0006 D6);
	// user renders a "Send to EHR" button on every completed ToolCallCard.
	const toolCallbacks: ToolCallback[] = [
		{
			toolName: '*',
			trigger: 'auto',
			handler: (event) => setAutoEvents((events) => [...events, event]),
		},
		{
			toolName: '*',
			trigger: 'user',
			label: 'Send to EHR',
			handler: (event) => setUserEvents((events) => [...events, event]),
		},
		{
			toolName: 'get_office_hours',
			trigger: 'user',
			label: 'EHR ▸ hours',
			handler: (event) => setUserEvents((events) => [...events, event]),
		},
	]

	const toolCallRenderers: ReactToolCallRenderer[] = [
		/** A host frontend tool + its custom renderer — proves client tools and
		 *  renderToolCalls ride the kit's runs AND take the card over inside the
		 *  kit surface (exact-name takeover, ADR 0006 D1). */
		defineToolCallRenderer({
			name: 'get_practice_protocol',
			args: z.unknown(), // the provider prop is typed ReactToolCallRenderer<unknown>[]
			render: ({ status, result }) => (
				<div className="kd-protocol-card" role="group" aria-label={`practice protocol (${String(status)})`}>
					<span className="kd-protocol-badge">host renderer</span>
					{typeof result === 'string' ? result : JSON.stringify(result ?? null)}
				</div>
			),
		}),
		/** Card THEMING through the same renderer mechanism: defineCavellToolCard wraps this config
		 *  into a standard renderer whose component is the kit's native card, re-skinned — next to the
		 *  full custom takeover the protocol tool demonstrates. */
		defineCavellToolCard({
			toolName: 'get_office_hours',
			icon: 'clock',
			defaultExpanded: true,
			title: (toolCall) =>
				toolCall.status === 'complete'
					? 'Office hours retrieved'
					: toolCall.status === 'error'
						? 'Office hours lookup failed'
						: 'Looking up office hours…',
			renderResult: (toolCall) => (
				<div className="kd-office-hours">
					🕗 {String((toolCall.result as { hours?: string } | undefined)?.hours ?? '')}
				</div>
			),
		}),
	]

	return (
		/**
		 * CavellProvider is the kit's top-level React context provider. It manages the run lifecycle, session state, and tool call rendering.
		 * The host app can customize its behavior through props like `context`, `prompt`, `locale`, `agentId`, and callbacks for session expiration and errors.
		 */
		<CavellProvider
			context={context}
			prompt={params.prompt}
			locale={params.locale}
			agentId={params.agent}
			runUrl={params.runUrl}
			baseUrl={params.baseUrl}
			threadId={params.threadId}
			// Capabilities are explicit harness configuration: `?caps=` (also authored by the
			// config panel's capability toggles) is the only source of overrides, so the demo
			// keeps the kit's own defaults — including recording OFF (ADR 0008): toggle it on
			// to exercise the STT surface (careconnect_gp carries the note skill server-side).
			capabilities={params.capabilities}
			disablePreloading={params.disablePreloading}
			headers={() => ({ Authorization: `Bearer ${params.token}` })} // `headers` is the kit's only auth channel; the thunk form is what token rotation uses.
			toolCallbacks={toolCallbacks}
			renderToolCalls={toolCallRenderers}
			onError={(event) => setErrorLog((log) => [...log, String(event.code)])}
			// Consultation recording (ADR 0008; effective with caps={"recording":true}). Both getters
			// are fetched at every recording START. getContext is the RECOMMENDED channel: the FHIR
			// Patient resource + a Medication resource per medication the patient is already using —
			// the ASR derives its vocabulary from them (here the harness panel's "recording context"
			// JSON). getDifficultWords supplements it with free-form words.
			recording={{
				getContext: () => parseRecordingContext(recordingContext),
				getDifficultWords: () =>
					difficultWords
						.split(',')
						.map((word) => word.trim())
						.filter(Boolean),
			}}
			onRecordingStateChange={(state) =>
				setRecordingLog((log) => [...log, `${state.status}:${Math.round(state.durationMs / 1000)}s`])
			}
		>
			<div className="kd-app">
				{/**
				 * The Companion component is a host-side UI that interacts with the CavellProvider.
				 * It displays session expiration status, allows clearing of problems, and logs
				 * window-control intents. It receives props for expired state, event handlers,
				 * and logging functions.
				 */}
				<Companion
					onWindowControl={(entry) => setWindowControlsLog((log) => [...log, entry])}
					onClearProblem={() =>
						setContext((current) => {
							const newContext = { ...current, problem: null } as Record<string, unknown>
							delete newContext.problem_term
							return newContext
						})
					}
				/>

				{/**
				 * The Tooling component is a host-side UI that provides controls for interacting with the CavellProvider.
				 * It displays error logs, window-control logs, auto events, user events, and allows context editing.
				 * It receives props for logging functions, context state, and a callback for context changes.
				 * Purely for demonstration purposes; a real host app would (not) implement tooling.
				 */}
				<Tooling
					errorLog={errorLog}
					windowControlsLog={windowControlsLog}
					autoEvents={autoEvents}
					userEvents={userEvents}
					recordingLog={recordingLog}
					difficultWords={difficultWords}
					onDifficultWordsChange={setDifficultWords}
					recordingContext={recordingContext}
					onRecordingContextChange={setRecordingContext}
					onContextChange={setContext}
				/>
			</div>
		</CavellProvider>
	)
}

export default App
