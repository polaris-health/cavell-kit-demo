/**
 * Kit demo host — the reference embedding of @cavell/kit for the browser E2E
 * (local_tests/integration_tests/corilus_app/cavell_kit_e2e_test.py +
 * cavell_kit_generic_agent_test.py) and for manual exploration
 * (`yarn workspace cavell-kit-demo dev`).
 *
 * Renders the full CavellAssistant surface AND a harness control panel that
 * covers the public API surface (useCavellCompanion, useFrontendTool,
 * useHumanInTheLoop, useInterrupt, custom renderToolCalls, toolCallbacks,
 * window chrome, capabilities/runUrl targeting, host context editing).
 *
 * E2E contract: the `kd-*` data-testids, the tool-callback feed entry headers
 * (`name:status[:source]`), the chrome-intent log text, and the state
 * data-attributes on kd-ready (data-run-active / data-awaiting-human /
 * data-expired / data-caps / data-display-mode). Keep those stable; style
 * everything else freely.
 *
 * Configuration via URL params:
 *   ?token=<corilus opaque token>      (required — a form asks otherwise)
 *   &base=local|qa|staging|prd|<origin>  (backend to target; default local = same-origin)
 *   &agent=careconnect_gp              (default careconnect_gp)
 *   &run_url=<path or url>             (runUrl override: ANY AG-UI agent, ADR 0006 D3)
 *   &caps=<json>                       (capabilities overrides, e.g. {"sessions":true})
 *   &thread=<thread id>                (open that conversation instead of boot)
 *   &patient=<id>                      (declared patient: numeric emr id → patient_id, else patient_resource_id)
 *   &patient_name=<name>               (declared context patient_name, shown on the badge pre-enrichment)
 *   &problem=<thesaurus code>          (declared context problem)
 *   &locale=<locale>                   (host-declared locale)
 *   &prompt=<text>                     (one-shot boot prompt)
 *   &disable_preloading=1              (skip auto-resume)
 *   &auto_scroll=<mode>                (pin-to-bottom | pin-to-send | hold-on-send | none)
 *   &nonce=<string>                    (returned by the demo frontend tool)
 */
import { ReactNode, useState } from 'react'

import { z } from 'zod'

import {
	type AutoScrollMode,
	CavellAssistant,
	type CavellCapabilities,
	CavellProvider,
	type DisplayMode,
	type SessionSummary,
	type ToolCallback,
	type ToolCallbackEvent,
	type ToolCardConfig,
	defineCavellToolCard,
	defineToolCallRenderer,
	sessionThreadId,
	useCavellCompanion,
	useCopilotKit,
	useFrontendTool,
	useHumanInTheLoop,
	useInterrupt,
} from '@cavell/kit'

const params = new URLSearchParams(window.location.search)
const TOKEN = params.get('token') ?? ''
const AGENT_ID = params.get('agent') ?? 'careconnect_gp'
const BASE_PARAM = params.get('base') ?? ''
const RUN_URL = params.get('run_url') ?? undefined
const CAPS_PARAM = params.get('caps') ?? ''
const THREAD_ID = params.get('thread') ?? undefined
const LOCALE = params.get('locale') ?? undefined
const PROMPT = params.get('prompt') ?? undefined
const PATIENT_ID = params.get('patient')
const PATIENT_NAME = params.get('patient_name')
const URL_PROBLEM = params.get('problem')
const DISABLE_PRELOADING = params.get('disable_preloading') === '1'
const NONCE = params.get('nonce') ?? 'KD-NONCE'

const AUTO_SCROLL_MODES = ['pin-to-bottom', 'pin-to-send', 'hold-on-send', 'none'] as const
const rawAutoScroll = params.get('auto_scroll')
const AUTO_SCROLL = AUTO_SCROLL_MODES.includes(rawAutoScroll as AutoScrollMode)
	? (rawAutoScroll as AutoScrollMode)
	: undefined

/** Selectable backends — the API origins, per `cavell-ai-assistant/ENVIRONMENTS.md`
 *  (VITE_CAVELL_API_URL), NOT the companion.* frontend hosts. `local` is '' = same-origin: the dev
 *  server's /api proxy and the E2E reverse proxy both live there, so it stays the default. The
 *  deployed origins are called cross-origin, which the API allows (`Allow-Origin: *`). */
const BACKENDS = [
	{ key: 'local', label: 'local — same-origin (/api proxy)', baseUrl: '' },
	{ key: 'qa', label: 'qa — qa.corilus.cavell.app', baseUrl: 'https://qa.corilus.cavell.app' },
	{ key: 'staging', label: 'staging — staging.corilus.cavell.app', baseUrl: 'https://staging.corilus.cavell.app' },
	{ key: 'prd', label: 'prd — corilus.cavell.app', baseUrl: 'https://corilus.cavell.app' },
] as const

/** An unknown value is taken as a literal API origin, so any stack can be targeted ad hoc. */
const resolveBaseUrl = (value: string): string => {
	const known = BACKENDS.find((backend) => backend.key === value)

	return known ? known.baseUrl : value.replace(/\/$/, '')
}

const BASE_URL = resolveBaseUrl(BASE_PARAM)

const capabilityOverrides = (): Partial<CavellCapabilities> | undefined => {
	if (!CAPS_PARAM) {
		return undefined
	}

	return JSON.parse(CAPS_PARAM) as Partial<CavellCapabilities>
}

/** A numeric id is the legacy emr spelling (patient_id); anything else is a resource UUID. */
const patientIdField = (id: string): Record<string, unknown> =>
	/^\d+$/.test(id) ? { patient_id: Number(id) } : { patient_resource_id: id }

const initialContext = (): Record<string, unknown> => {
	const context: Record<string, unknown> = {}
	if (PATIENT_ID) {
		Object.assign(context, patientIdField(PATIENT_ID))
		if (PATIENT_NAME) {
			context.patient_name = PATIENT_NAME
		}
	}
	if (URL_PROBLEM) {
		context.problem = URL_PROBLEM
	}

	return context
}

/** A host frontend tool + its custom renderer — proves client tools and
 *  renderToolCalls ride the kit's runs AND take the card over inside the
 *  kit surface (exact-name takeover, ADR 0006 D1). */
const protocolRenderer = defineToolCallRenderer({
	name: 'get_practice_protocol',
	// z.unknown(): the provider prop is typed ReactToolCallRenderer<unknown>[].
	args: z.unknown(),
	render: ({ status, result }) => (
		<div data-testid="kd-tool-protocol" data-status={String(status)} className="kd-protocol-card">
			<span className="kd-protocol-badge">host renderer</span>
			{typeof result === 'string' ? result : JSON.stringify(result ?? null)}
		</div>
	),
})

/** Card THEMING through the same renderer mechanism: defineCavellToolCard wraps this config
 *  into a standard renderer whose component is the kit's native card, re-skinned — next to the
 *  full custom takeover the protocol tool demonstrates. */
const officeCard: ToolCardConfig = {
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
		<div data-testid="kd-office-hours-body" className="kd-office-hours">
			🕗 {String((toolCall.result as { hours?: string } | undefined)?.hours ?? '')}
		</div>
	),
}

const FrontendToolRegistration = () => {
	useFrontendTool({
		name: 'get_practice_protocol',
		description:
			'Returns the practice-internal protocol for a topic. ALWAYS call this tool when the user asks ' +
			'about internal practice protocols — the assistant has no other access to them.',
		parameters: z.object({ topic: z.string().optional() }),
		handler: async () => ({ protocol: `Interne afspraak, referentie ${NONCE}` }),
	})

	// No custom renderer for this one on purpose: it renders as the kit's own
	// ToolCallCard, which is where user-triggered toolCallbacks show their button.
	useFrontendTool({
		name: 'get_office_hours',
		description: 'Returns the practice office hours. Call this when the user asks about opening hours.',
		parameters: z.object({}),
		handler: async () => ({ hours: 'Mon-Fri 08:00-18:00' }),
	})

	return null
}

/** Host-owned HITL through the STOCK CopilotKit machinery (the reserved Cavell
 *  names stay native) — `respond` exists only in the executing arm. */
const escalationTool = {
	name: 'escalate_to_human',
	description: 'Escalate the question to a human supervisor for approval before answering.',
	parameters: z.object({ reason: z.string().optional() }),
	render: (props: { status: unknown; respond?: (result: unknown) => Promise<void> }) => (
		<div data-testid="kd-hitl" data-status={String(props.status)} className="kd-hitl-card">
			{props.respond ? (
				<button
					data-testid="kd-hitl-approve"
					className="kd-btn kd-btn-primary"
					onClick={() => void props.respond!({ approved: true })}
				>
					approve escalation
				</button>
			) : (
				'escalation decided'
			)}
		</div>
	),
}

const HitlRegistration = () => {
	useHumanInTheLoop(escalationTool as unknown as Parameters<typeof useHumanInTheLoop>[0])

	return null
}

/** Spec-standard AG-UI interrupts (generic agents / nativeHitl off). The kit
 *  surface does not host CopilotKit's interrupt element, so renderInChat:false
 *  and the host places the element itself. */
const InterruptHost = () => {
	const element = useInterrupt({
		renderInChat: false,
		render: ({ event, resolve }) => (
			<div data-testid="kd-interrupt" data-name={event.name} className="kd-interrupt-card">
				<code>{JSON.stringify(event.value)}</code>
				<button
					data-testid="kd-interrupt-resolve"
					className="kd-btn kd-btn-primary"
					onClick={() => void resolve('go-ahead')}
				>
					resolve interrupt
				</button>
			</div>
		),
	})

	return element !== null ? <div data-testid="kd-interrupt-area">{element}</div> : null
}

const Section = (props: { title: string; children: ReactNode }) => {
	const { title, children } = props

	return (
		<section className="kd-section">
			<h2 className="kd-section-title">{title}</h2>
			{children}
		</section>
	)
}

const Row = (props: { label: string; children: ReactNode }) => {
	const { label, children } = props

	return (
		<div className="kd-row">
			<span className="kd-row-label">{label}</span>
			<span className="kd-row-value">{children}</span>
		</div>
	)
}

const Flag = (props: { label: string; on: boolean }) => {
	const { label, on } = props

	return <span className={`kd-chip ${on ? 'kd-chip-on' : 'kd-chip-off'}`}>{label}</span>
}

/** The registered frontend tools, read live from the CopilotKit core. Render-time read of a
 *  mutable registry: registrations happen at mount and the panel re-renders on every store
 *  update, so staleness is a non-issue for a harness. */
const FrontendToolsSection = () => {
	const { copilotkit } = useCopilotKit()

	const tools = copilotkit.tools
	const rendererNames = new Set(copilotkit.renderToolCalls.map((renderer) => renderer.name))

	return (
		<Section title={`Frontend tools · ${tools.length}`}>
			<div className="kd-tools" data-testid="kd-frontend-tools">
				{tools.map((tool) => (
					<div key={tool.name} className="kd-tool" data-testid="kd-frontend-tool" data-name={tool.name}>
						<div className="kd-tool-head">
							<code>{tool.name}</code>
							{rendererNames.has(tool.name) ? <span className="kd-chip kd-chip-on">renderer</span> : null}
						</div>
						{tool.description ? <p className="kd-tool-desc">{tool.description}</p> : null}
					</div>
				))}
			</div>
		</Section>
	)
}

/** One tool-callback feed: entry headers stay `name:status[:source]` (E2E contract), the
 *  full event (args/result/thread) expands underneath. */
const CallbackFeed = (props: { testid: string; events: ToolCallbackEvent[]; withSource: boolean }) => {
	const { testid, events, withSource } = props

	return (
		<div className="kd-feed" data-testid={testid}>
			{events.map((event, index) => (
				<details key={`${event.toolCallId}-${index}`} className="kd-event">
					<summary>
						<code>
							{withSource
								? `${event.toolName}:${event.status}:${event.source}`
								: `${event.toolName}:${event.status}`}
						</code>
					</summary>
					<pre>
						{JSON.stringify(
							{
								toolCallId: event.toolCallId,
								threadId: event.threadId,
								args: event.args,
								result: event.result,
							},
							null,
							2,
						)}
					</pre>
				</details>
			))}
		</div>
	)
}

interface BackendSelectProps {
	testid: string
	value: string
	onChange: (value: string) => void
}

/** The `base` picker, shared by the token screen and the reload-with-config form. */
const BackendSelect = (props: BackendSelectProps) => {
	const { testid, value, onChange } = props
	// A `base` matching no key is a literal origin — keep it selectable so it isn't silently lost.
	const custom = value !== '' && !BACKENDS.some((backend) => backend.key === value)

	return (
		<select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}>
			{BACKENDS.map((backend) => (
				<option key={backend.key} value={backend.key === 'local' ? '' : backend.key}>
					{backend.label}
				</option>
			))}
			{custom ? <option value={value}>{value}</option> : null}
		</select>
	)
}

/** Reload the demo with different provider knobs (provider props are mount-time here). */
const ConfigForm = () => {
	const [backend, setBackend] = useState(BASE_PARAM)
	const [agent, setAgent] = useState(AGENT_ID)
	const [locale, setLocale] = useState(LOCALE ?? '')
	const [runUrl, setRunUrl] = useState(RUN_URL ?? '')
	const [caps, setCaps] = useState(CAPS_PARAM)
	const [prompt, setPrompt] = useState(PROMPT ?? '')
	const [autoScroll, setAutoScroll] = useState(AUTO_SCROLL ?? '')
	const [preloading, setPreloading] = useState(!DISABLE_PRELOADING)

	const apply = () => {
		const url = new URL(window.location.href)
		const set = (key: string, value: string) => {
			if (value) {
				url.searchParams.set(key, value)
			} else {
				url.searchParams.delete(key)
			}
		}
		set('base', backend)
		// Opaque tokens are issued per environment, so a backend switch invalidates the current one:
		// drop it and let the token form ask again for the new target.
		if (backend !== BASE_PARAM) {
			set('token', '')
		}
		set('agent', agent)
		set('locale', locale)
		set('run_url', runUrl)
		set('caps', caps)
		set('prompt', prompt)
		set('auto_scroll', autoScroll)
		set('thread', '')
		set('disable_preloading', preloading ? '' : '1')
		window.location.href = url.toString()
	}

	return (
		<div className="kd-config">
			<label>
				backend <BackendSelect testid="kd-cfg-backend" value={backend} onChange={setBackend} />
			</label>
			<label>
				agent <input data-testid="kd-cfg-agent" value={agent} onChange={(e) => setAgent(e.target.value)} />
			</label>
			<label>
				locale{' '}
				<input
					data-testid="kd-cfg-locale"
					value={locale}
					placeholder="backend-resolved"
					onChange={(e) => setLocale(e.target.value)}
				/>
			</label>
			<label>
				runUrl{' '}
				<input
					data-testid="kd-cfg-run-url"
					value={runUrl}
					placeholder="/api/…/run (any AG-UI agent)"
					onChange={(e) => setRunUrl(e.target.value)}
				/>
			</label>
			<label>
				caps{' '}
				<input
					data-testid="kd-cfg-caps"
					value={caps}
					placeholder='{"sessions":true}'
					onChange={(e) => setCaps(e.target.value)}
				/>
			</label>
			<label>
				boot prompt{' '}
				<input data-testid="kd-cfg-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
			</label>
			<label>
				autoScroll{' '}
				<select
					data-testid="kd-cfg-auto-scroll"
					value={autoScroll}
					onChange={(e) => setAutoScroll(e.target.value)}
				>
					<option value="">hold-on-send (default)</option>
					<option value="pin-to-bottom">pin-to-bottom</option>
					<option value="pin-to-send">pin-to-send</option>
					<option value="none">none</option>
				</select>
			</label>
			<label className="kd-config-check">
				<input type="checkbox" checked={preloading} onChange={(e) => setPreloading(e.target.checked)} />
				auto-resume (preloading)
			</label>
			<button data-testid="kd-cfg-apply" className="kd-btn kd-btn-primary" onClick={apply}>
				reload with config
			</button>
		</div>
	)
}

interface HarnessProps {
	width: number
	onRemoveField: (key: string) => void
	onSetPatient: (id: string, name: string, insz: string) => void
	onClearPatient: () => void
	onSetProblem: (code: string, term: string) => void
	onClearProblem: () => void
	autoEvents: ToolCallbackEvent[]
	userEvents: ToolCallbackEvent[]
	chromeLog: string[]
	errorLog: string[]
}

const HarnessPanel = (props: HarnessProps) => {
	const { width, onRemoveField, onSetPatient, onClearPatient, onSetProblem, onClearProblem } = props
	const { autoEvents, userEvents, chromeLog, errorLog } = props

	const companion = useCavellCompanion()
	const [draft, setDraft] = useState('')
	const [patientIdDraft, setPatientIdDraft] = useState('')
	const [patientNameDraft, setPatientNameDraft] = useState('')
	const [patientInszDraft, setPatientInszDraft] = useState('')
	const [problemDraft, setProblemDraft] = useState('')
	const [problemTermDraft, setProblemTermDraft] = useState('')
	const [threadDraft, setThreadDraft] = useState('')
	const [sessions, setSessions] = useState<SessionSummary[] | null>(null)

	const lastAssistantMessage = [...companion.timeline]
		.reverse()
		.find((entry) => entry.kind === 'message' && entry.type === 'assistant')

	const contextEntries = Object.entries(companion.hostContext)
	const ratedIds = Object.keys(companion.feedbackSent)
	const noEvents =
		autoEvents.length === 0 && userEvents.length === 0 && chromeLog.length === 0 && errorLog.length === 0

	const refreshSessions = async () => {
		const page = await companion.listSessions(1, 30)
		setSessions(page.sessions)
	}

	const send = (text: string) => {
		if (text.trim()) {
			void companion.send(text)
		}
	}

	const rateLast = (rating: 'up' | 'down') => {
		if (lastAssistantMessage) {
			companion.sendFeedback({ rating, target: { messageId: lastAssistantMessage.id } })
		}
	}

	return (
		<aside className="kd-panel" style={{ width }}>
			<div className="kd-panel-header">
				<span className="kd-panel-title">Kit Harness</span>
				<span className="kd-chip kd-chip-accent">{RUN_URL ? `runUrl → ${RUN_URL}` : AGENT_ID}</span>
			</div>

			<Section title="Session">
				<Row label="phase">
					<span data-testid="kd-phase" className={`kd-chip kd-phase-${companion.phase}`}>
						{companion.phase}
					</span>
				</Row>
				<Row label="thread">
					<code data-testid="kd-thread" className="kd-code">
						{companion.threadId}
					</code>
				</Row>
				<Row label="locale · timeline">
					<span data-testid="kd-locale" className="kd-chip kd-chip-on">
						{companion.locale}
					</span>{' '}
					<span data-testid="kd-timeline-count" className="kd-code">
						{companion.timeline.length} entries
					</span>
				</Row>
				<div className="kd-chips">
					<Flag label="run active" on={companion.runActive} />
					<Flag label="awaiting human" on={companion.awaitingHuman} />
					<Flag label="stopped" on={companion.stopped} />
					<Flag label="expired" on={companion.sessionExpired} />
				</div>
				{companion.runError !== null ? (
					<div className="kd-alert" data-testid="kd-run-error">
						{companion.runError}
					</div>
				) : null}
			</Section>

			<Section title="Capabilities">
				<div className="kd-chips">
					<Flag label="sessions" on={companion.capabilities.sessions} />
					<Flag label="feedback" on={companion.capabilities.feedback} />
					<Flag label="starters" on={companion.capabilities.starters} />
					<Flag label="native HITL" on={companion.capabilities.nativeHitl} />
				</div>
			</Section>

			<FrontendToolsSection />

			<Section title="Compose">
				<div className="kd-composer">
					<input
						data-testid="kd-input"
						value={draft}
						placeholder="message the agent…"
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								send(draft)
								setDraft('')
							}
						}}
					/>
					<button
						data-testid="kd-send"
						className="kd-btn kd-btn-primary"
						onClick={() => {
							send(draft)
							setDraft('')
						}}
					>
						send
					</button>
				</div>
				<div className="kd-btn-row">
					<button data-testid="kd-stop" className="kd-btn" onClick={() => companion.stop()}>
						stop run
					</button>
					<button data-testid="kd-new" className="kd-btn" onClick={() => companion.newConversation()}>
						new conversation
					</button>
					<button
						data-testid="kd-feedback-up"
						className="kd-btn"
						disabled={!lastAssistantMessage}
						onClick={() => rateLast('up')}
					>
						👍
					</button>
					<button
						data-testid="kd-feedback-down"
						className="kd-btn"
						disabled={!lastAssistantMessage}
						onClick={() => rateLast('down')}
					>
						👎
					</button>
				</div>
				{companion.starters.length > 0 ? (
					<div className="kd-chips" data-testid="kd-starters">
						{companion.starters.map((starter) => (
							<button
								key={starter.question}
								data-testid="kd-starter-chip"
								className="kd-suggestion"
								title={starter.topic}
								onClick={() => send(starter.question)}
							>
								{starter.question}
							</button>
						))}
					</div>
				) : null}
				{companion.followups.length > 0 ? (
					<div className="kd-chips" data-testid="kd-followups">
						{companion.followups.map((followup) => (
							<button
								key={followup}
								data-testid="kd-followup-chip"
								className="kd-suggestion"
								onClick={() => send(followup)}
							>
								{followup}
							</button>
						))}
					</div>
				) : null}
				{ratedIds.length > 0 ? (
					<Row label="rated">
						<code data-testid="kd-feedback-sent" className="kd-code">
							{ratedIds.join(' | ')}
						</code>
					</Row>
				) : null}
			</Section>

			<Section title="Host context">
				{contextEntries.length > 0 ? (
					<div className="kd-ctx-entries" data-testid="kd-ctx-entries">
						{contextEntries.map(([key, value]) => (
							<div key={key} className="kd-ctx-entry">
								<code className="kd-ctx-entry-key">{key}</code>
								<code className="kd-ctx-entry-value">{JSON.stringify(value)}</code>
								<button
									data-testid="kd-ctx-remove"
									data-key={key}
									className="kd-ctx-entry-remove"
									aria-label={`remove ${key}`}
									onClick={() => onRemoveField(key)}
								>
									✕
								</button>
							</div>
						))}
					</div>
				) : (
					<span className="kd-empty">no host-declared context</span>
				)}
				<div className="kd-composer kd-patient-controls">
					<input
						data-testid="kd-patient-id-input"
						value={patientIdDraft}
						placeholder="patient id (uuid or emr nr)"
						onChange={(e) => setPatientIdDraft(e.target.value)}
					/>
					<input
						data-testid="kd-patient-name-input"
						value={patientNameDraft}
						placeholder="name (optional)"
						onChange={(e) => setPatientNameDraft(e.target.value)}
					/>
				</div>
				<div className="kd-composer kd-patient-controls">
					<input
						data-testid="kd-patient-insz-input"
						value={patientInszDraft}
						placeholder="INSZ (optional)"
						onChange={(e) => setPatientInszDraft(e.target.value)}
					/>
					<button
						data-testid="kd-set-patient"
						className="kd-btn"
						onClick={() => {
							if (patientIdDraft.trim()) {
								onSetPatient(patientIdDraft.trim(), patientNameDraft.trim(), patientInszDraft.trim())
							}
						}}
					>
						set patient
					</button>
					<button data-testid="kd-clear-patient" className="kd-btn" onClick={() => onClearPatient()}>
						clear
					</button>
				</div>
				{companion.pendingHostPatient !== null ? (
					<Row label="pending patient">
						<code data-testid="kd-pending-patient" className="kd-code">
							{JSON.stringify(companion.pendingHostPatient)}
						</code>
					</Row>
				) : null}
				<div className="kd-composer kd-problem-controls">
					<input
						data-testid="kd-problem-input"
						value={problemDraft}
						placeholder="problem code (e.g. K74)"
						onChange={(e) => setProblemDraft(e.target.value)}
					/>
					<input
						data-testid="kd-problem-term-input"
						value={problemTermDraft}
						placeholder="term (optional)"
						onChange={(e) => setProblemTermDraft(e.target.value)}
					/>
					<button
						data-testid="kd-set-problem"
						className="kd-btn"
						onClick={() => onSetProblem(problemDraft, problemTermDraft.trim())}
					>
						set problem
					</button>
					<button data-testid="kd-clear-problem" className="kd-btn" onClick={() => onClearProblem()}>
						clear
					</button>
				</div>
				{companion.pendingHostProblem !== null ? (
					<Row label="pending problem">
						<code className="kd-code">{JSON.stringify(companion.pendingHostProblem)}</code>
					</Row>
				) : null}
				<span className="kd-feed-label">resolved session context (server)</span>
				<div className="kd-json" data-testid="kd-context">
					{JSON.stringify(companion.sessionContext)}
				</div>
			</Section>

			<Section title="History">
				<div className="kd-composer">
					<input
						data-testid="kd-open-thread-input"
						value={threadDraft}
						placeholder="thread id"
						onChange={(e) => setThreadDraft(e.target.value)}
					/>
					<button
						data-testid="kd-open-thread"
						className="kd-btn"
						onClick={() => void companion.openConversation(threadDraft.trim())}
					>
						open
					</button>
					<button data-testid="kd-sessions-refresh" className="kd-btn" onClick={() => void refreshSessions()}>
						list sessions
					</button>
				</div>
				{sessions !== null ? (
					<div data-testid="kd-sessions" className="kd-sessions">
						{sessions.length === 0 ? <span className="kd-empty">no conversations</span> : null}
						{sessions.map((session) => (
							<button
								key={session.session_id}
								className="kd-session-row"
								data-testid="kd-session-row"
								data-thread-id={sessionThreadId(session)}
								onClick={() => void companion.openConversation(sessionThreadId(session))}
							>
								<span className="kd-session-preview">{session.preview ?? '(no preview)'}</span>
								<code className="kd-session-id">{sessionThreadId(session)}</code>
							</button>
						))}
					</div>
				) : null}
			</Section>

			<Section title="Events">
				{noEvents ? <span className="kd-empty">no events yet</span> : null}
				<div className="kd-feed-block">
					<span className="kd-feed-label">tool callbacks · auto</span>
					<CallbackFeed testid="kd-toolcb-log" events={autoEvents} withSource />
				</div>
				<div className="kd-feed-block">
					<span className="kd-feed-label">tool callbacks · user</span>
					<CallbackFeed testid="kd-toolcb-user-log" events={userEvents} withSource={false} />
				</div>
				<div className="kd-feed-block">
					<span className="kd-feed-label">chrome intents</span>
					<div className="kd-feed kd-feed-text" data-testid="kd-chrome-log">
						{chromeLog.join(' | ')}
					</div>
				</div>
				<div className="kd-feed-block">
					<span className="kd-feed-label">onError</span>
					<div className="kd-feed kd-feed-text kd-feed-error" data-testid="kd-error-log">
						{errorLog.join(' | ')}
					</div>
				</div>
			</Section>

			<InterruptHost />

			<Section title="Reload with config">
				<ConfigForm />
			</Section>
		</aside>
	)
}

const TokenForm = () => {
	const [value, setValue] = useState('')
	const [backend, setBackend] = useState(BASE_PARAM)

	return (
		<div className="kd-token-form">
			<h1>Cavell Kit Demo</h1>
			<label>
				backend <BackendSelect testid="kd-backend-select" value={backend} onChange={setBackend} />
			</label>
			<input
				data-testid="kd-token-input"
				value={value}
				placeholder="Corilus opaque token"
				onChange={(e) => setValue(e.target.value)}
			/>
			<button
				data-testid="kd-token-submit"
				className="kd-btn kd-btn-primary"
				onClick={() => {
					const url = new URL(window.location.href)
					url.searchParams.set('token', value.trim())
					if (backend) {
						url.searchParams.set('base', backend)
					} else {
						url.searchParams.delete('base')
					}
					window.location.href = url.toString()
				}}
			>
				Open
			</button>
		</div>
	)
}

const PANEL_MIN = 320
/** The assistant may shrink to its embedded-EHR side-panel width — dragging the resizer far
 *  left is exactly how you preview the companion form factor. */
const ASSISTANT_MIN = 340

const clampPanelWidth = (width: number): number =>
	Math.min(window.innerWidth - ASSISTANT_MIN, Math.max(PANEL_MIN, width))

interface ShellProps {
	expired: boolean
	onRemoveField: (key: string) => void
	onSetPatient: (id: string, name: string, insz: string) => void
	onClearPatient: () => void
	onSetProblem: (code: string, term: string) => void
	onClearProblem: () => void
	onChrome: (entry: string) => void
	autoEvents: ToolCallbackEvent[]
	userEvents: ToolCallbackEvent[]
	chromeLog: string[]
	errorLog: string[]
}

/** Layout + the kd-ready state attributes (the E2E contract reads flags/caps here). */
const Shell = (props: ShellProps) => {
	const { expired, onRemoveField, onSetPatient, onClearPatient, onSetProblem, onClearProblem, onChrome, ...logs } =
		props

	const companion = useCavellCompanion()
	// The kit reports the pick; applying it is the host's half of the contract (ADR 0006 D7) —
	// here a data attribute the demo CSS keys the three form factors off.
	const [displayMode, setDisplayMode] = useState<DisplayMode>('sidepanel')
	const [panelWidth, setPanelWidth] = useState(() => {
		const stored = Number(localStorage.getItem('kd-panel-width'))

		return Number.isFinite(stored) && stored > 0 ? clampPanelWidth(stored) : 460
	})

	const startResize = (event: React.PointerEvent) => {
		event.preventDefault()
		const onMove = (move: PointerEvent) => {
			const width = clampPanelWidth(window.innerWidth - move.clientX)
			setPanelWidth(width)
			localStorage.setItem('kd-panel-width', String(width))
		}
		const onUp = () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
		}
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
	}

	return (
		<div
			className="kd-layout"
			data-testid="kd-ready"
			data-expired={String(expired)}
			data-run-active={String(companion.runActive)}
			data-awaiting-human={String(companion.awaitingHuman)}
			data-stopped={String(companion.stopped)}
			data-caps={JSON.stringify(companion.capabilities)}
			data-display-mode={displayMode}
		>
			<div className="kd-assistant">
				<CavellAssistant
					onClearProblem={onClearProblem}
					autoScroll={AUTO_SCROLL}
					chrome={{ close: true, displayModes: true }}
					onClose={() => onChrome('close')}
					displayMode={displayMode}
					onDisplayModeChange={(mode) => {
						setDisplayMode(mode)
						onChrome(`display:${mode}`)
					}}
				/>
			</div>
			<div
				className="kd-resizer"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize harness panel"
				onPointerDown={startResize}
			/>
			<HarnessPanel
				width={panelWidth}
				onRemoveField={onRemoveField}
				onSetPatient={onSetPatient}
				onClearPatient={onClearPatient}
				onSetProblem={onSetProblem}
				onClearProblem={onClearProblem}
				{...logs}
			/>
		</div>
	)
}

const App = () => {
	const [context, setContext] = useState(initialContext)
	const [expired, setExpired] = useState(false)
	const [autoEvents, setAutoEvents] = useState<ToolCallbackEvent[]>([])
	const [userEvents, setUserEvents] = useState<ToolCallbackEvent[]>([])
	const [chromeLog, setChromeLog] = useState<string[]>([])
	const [errorLog, setErrorLog] = useState<string[]>([])

	if (!TOKEN) {
		return <TokenForm />
	}

	const removeField = (key: string) => {
		setContext((current) => {
			const next = { ...current }
			delete next[key]

			return next
		})
	}
	// Host problem declaration: code + optional display term (a stale term never survives a switch).
	const setProblem = (code: string, term: string) => {
		setContext((current) => {
			const next: Record<string, unknown> = { ...current, problem: code }
			if (term) {
				next.problem_term = term
			} else {
				delete next.problem_term
			}

			return next
		})
	}
	// Declarative cleared hint, mirroring the ai-assistant host (null ≠ absent).
	const clearProblem = () => {
		setContext((current) => {
			const next: Record<string, unknown> = { ...current, problem: null }
			delete next.problem_term

			return next
		})
	}
	// The host-enriched patient declaration (MIGRATION.md contract): the id plus the display
	// fields the badge renders until the server enriches at the next run.
	const setPatient = (id: string, name: string, insz: string) => {
		setContext((current) => {
			const next = { ...current }
			delete next.patient_id
			delete next.patient_resource_id
			delete next.patient_name
			delete next.patient_insz
			Object.assign(next, patientIdField(id))
			if (name) {
				next.patient_name = name
			}
			if (insz) {
				next.patient_insz = insz
			}

			return next
		})
	}
	// Both id spellings must clear: a null resource id with a surviving numeric id still declares.
	const clearPatient = () => {
		setContext((current) => {
			const next: Record<string, unknown> = { ...current, patient_id: null, patient_resource_id: null }
			delete next.patient_name
			delete next.patient_insz

			return next
		})
	}

	// Auto fires on live completions only (replay must not re-fire — ADR 0006 D6);
	// user renders a "Send to EHR" button on every completed ToolCallCard.
	const toolCallbacks: ToolCallback[] = [
		{
			toolName: '*',
			trigger: 'auto',
			handler: (event) => {
				setAutoEvents((events) => [...events, event])
			},
		},
		{
			toolName: '*',
			trigger: 'user',
			label: 'Send to EHR',
			handler: (event) => {
				setUserEvents((events) => [...events, event])
			},
		},
		// Per-callback button label (ToolCallback.label — string or (t) => string).
		{
			toolName: 'get_office_hours',
			trigger: 'user',
			label: 'EHR ▸ hours',
			handler: (event) => {
				setUserEvents((events) => [...events, event])
			},
		},
	]

	return (
		<CavellProvider
			agentId={AGENT_ID}
			// `headers` is the kit's only auth channel; the thunk form is what token rotation uses.
			headers={() => ({ Authorization: `Bearer ${TOKEN}` })}
			baseUrl={BASE_URL}
			runUrl={RUN_URL}
			capabilities={capabilityOverrides()}
			context={context}
			locale={LOCALE}
			prompt={PROMPT}
			disablePreloading={DISABLE_PRELOADING}
			threadId={THREAD_ID}
			onSessionExpired={() => setExpired(true)}
			onError={(event) => {
				setErrorLog((log) => [...log, String(event.code)])
			}}
			renderToolCalls={[protocolRenderer, defineCavellToolCard(officeCard)]}
			toolCallbacks={toolCallbacks}
		>
			<FrontendToolRegistration />
			<HitlRegistration />
			<Shell
				expired={expired}
				onRemoveField={removeField}
				onSetPatient={setPatient}
				onClearPatient={clearPatient}
				onSetProblem={setProblem}
				onClearProblem={clearProblem}
				onChrome={(entry) => setChromeLog((log) => [...log, entry])}
				autoEvents={autoEvents}
				userEvents={userEvents}
				chromeLog={chromeLog}
				errorLog={errorLog}
			/>
		</CavellProvider>
	)
}

export default App
