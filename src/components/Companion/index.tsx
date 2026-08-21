import { useState } from 'react'

import z from 'zod'

import { CavellAssistant, DISPLAY_MODES, DisplayMode, useHumanInTheLoop } from '@cavell/kit'

import useFrontendTools from '../../hooks/useFrontendTools'
import params from '../../params'

interface Props {
	onWindowControl: (entry: string) => void
	onClearProblem: () => void
}

const Companion = (props: Props) => {
	const { onClearProblem, onWindowControl } = props

	useFrontendTools()

	/** Host-owned HITL through the STOCK CopilotKit machinery (the reserved Cavell
	 *  names stay native) — `respond` exists only in the executing arm. */
	useHumanInTheLoop({
		name: 'escalate_to_human',
		description: 'Escalate the question to a human supervisor for approval before answering.',
		parameters: z.object({ reason: z.string().optional() }),
		render: (props: { status: unknown; respond?: (result: unknown) => Promise<void> }) => (
			<div className="kd-hitl-card">
				{props.respond ? (
					<button
						className="kd-btn kd-btn-primary"
						onClick={async () => await props.respond!({ approved: true })}
					>
						approve escalation
					</button>
				) : (
					'escalation decided'
				)}
			</div>
		),
	})

	// `?display_modes=` decides which rows the ⋮ menu offers, so the layout we boot in has to be
	// one of them — an unoffered mode could never be left again.
	const offered = params.displayModes === true ? DISPLAY_MODES : params.displayModes || []

	// The kit reports the pick; applying it is the host's half of the contract (ADR 0006 D7)
	const [displayMode, setDisplayMode] = useState<DisplayMode>(offered[0] ?? 'sidepanel')

	return (
		<div className={`kd-layout kd-display-${displayMode}`}>
			<div className="kd-assistant">
				<CavellAssistant
					displayMode={displayMode}
					autoScroll={params.autoScroll}
					windowControls={{ close: true, displayModes: params.displayModes }}
					onClose={() => onWindowControl('close')}
					onClearProblem={onClearProblem}
					onDisplayModeChange={(mode) => {
						setDisplayMode(mode)
						onWindowControl(`display:${mode}`)
					}}
				/>
			</div>
		</div>
	)
}

export default Companion
