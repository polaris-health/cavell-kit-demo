import { useState } from 'react'

import { DISPLAY_MODES, type DisplayMode } from '@cavell/kit'

import params from '../../../../params'
import reloadWithParams from '../../../../params/reloadWithParams'
import { isContextObject } from '../../../../params/typeguards'
import createInitialContext from '../../../../utils/createInitialContext'
import BackendSelect from '../../../BackendSelect'
import Section from '../shared/Section'

/** The box shows the context the page actually booted with — the single-key params (?patient=,
 *  ?problem=, ?specialty=) folded in — so editing it is editing the whole declaration. */
const bootContextDraft = (): string => {
	const context = createInitialContext()

	return Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : ''
}

/** Compact JSON for the URL, '' for a blank box, null for "not a JSON object" (the error case). */
const parseContextDraft = (draft: string): string | null => {
	const trimmed = draft.trim()
	if (!trimmed) {
		return ''
	}

	try {
		const parsed: unknown = JSON.parse(trimmed)

		return isContextObject(parsed) ? JSON.stringify(parsed) : null
	} catch {
		return null
	}
}

const ConfigTool = () => {
	const [backend, setBackend] = useState(params.base)
	const [agent, setAgent] = useState(params.agent)
	const [locale, setLocale] = useState(params.locale ?? '')
	const [runUrl, setRunUrl] = useState(params.runUrl ?? '')
	const [caps, setCaps] = useState(params.caps)
	const [prompt, setPrompt] = useState(params.prompt ?? '')
	const [autoScroll, setAutoScroll] = useState<string>(params.autoScroll ?? '')
	const [preloading, setPreloading] = useState(!params.disablePreloading)
	const [context, setContext] = useState(bootContextDraft)
	const [contextError, setContextError] = useState('')
	const [displayModes, setDisplayModes] = useState<DisplayMode[]>(
		params.displayModes === true ? [...DISPLAY_MODES] : params.displayModes || [],
	)

	// Rebuilt from the kit's canonical order, so the menu's row order stays predictable; ordering a
	// subset differently is a URL-only move (`?display_modes=overlay,sidepanel`).
	const toggleMode = (mode: DisplayMode, checked: boolean) => {
		setDisplayModes(
			DISPLAY_MODES.filter((candidate) => (candidate === mode ? checked : displayModes.includes(candidate))),
		)
	}

	const apply = () => {
		// Unlike ?caps=, a bad context is caught here rather than warned about after the reload — the
		// reload is what would throw the draft away.
		const initialContext = parseContextDraft(context)
		if (initialContext === null) {
			setContextError('not a JSON object')

			return
		}

		setContextError('')

		// Opaque tokens are issued per environment, so a backend switch invalidates the current one:
		// drop it and let the token form ask again for the new target.
		const tokenReset: Record<string, string> = backend !== params.base ? { token: '' } : {}

		reloadWithParams({
			...tokenReset,
			base: backend,
			agent,
			locale,
			run_url: runUrl,
			caps,
			prompt,
			auto_scroll: autoScroll,
			// All three is the default, so it drops out of the URL; none is a value of its own.
			display_modes: displayModes.length === DISPLAY_MODES.length ? '' : displayModes.join(',') || 'none',
			thread: '',
			disable_preloading: preloading ? '' : '1',
			// ?context= supersedes the single-key params, so they are dropped rather than left to
			// contradict what the box says (an empty box hands the URL back to them).
			context: initialContext,
			...(initialContext ? { patient: '', patient_name: '', problem: '', specialty: '' } : {}),
		})
	}

	return (
		<Section title="Reload with config">
			<div className="kd-config">
				<label>
					backend <BackendSelect value={backend} onChange={setBackend} />
				</label>
				<label>
					agent <input value={agent} onChange={(e) => setAgent(e.target.value)} />
				</label>
				<label>
					locale{' '}
					<input value={locale} placeholder="backend-resolved" onChange={(e) => setLocale(e.target.value)} />
				</label>
				<label>
					runUrl{' '}
					<input
						value={runUrl}
						placeholder="/api/…/run (any AG-UI agent)"
						onChange={(e) => setRunUrl(e.target.value)}
					/>
				</label>
				<label>
					caps{' '}
					<input value={caps} placeholder='{"sessions":true}' onChange={(e) => setCaps(e.target.value)} />
				</label>
				<label>
					boot prompt <input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
				</label>
				<label>
					autoScroll{' '}
					<select value={autoScroll} onChange={(e) => setAutoScroll(e.target.value)}>
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
				{/* The other half of preloading: what the kit boots with decides which conversation it
				    resumes (patient scope + problem match, from the INIT-time context only). */}
				<label className="kd-config-context">
					initial context
					<textarea
						value={context}
						rows={5}
						spellCheck={false}
						placeholder={'{\n  "patient_resource_id": "…",\n  "problem": "K74"\n}'}
						onChange={(e) => {
							setContext(e.target.value)
							setContextError('')
						}}
					/>
				</label>
				{contextError ? (
					<p className="kd-alert" role="alert">
						initial context: {contextError}
					</p>
				) : null}
				<div className="kd-config-modes">
					<span>display modes</span>
					{DISPLAY_MODES.map((mode) => (
						<label key={mode} className="kd-config-check">
							<input
								type="checkbox"
								checked={displayModes.includes(mode)}
								onChange={(e) => toggleMode(mode, e.target.checked)}
							/>
							{mode}
						</label>
					))}
				</div>
				<button className="kd-btn kd-btn-primary" onClick={apply}>
					reload with config
				</button>
			</div>
		</Section>
	)
}

export default ConfigTool
