import { useSyncExternalStore } from 'react'

import { ToolCallbackEvent } from '@cavell/kit'

import CapabilitiesTool from './components/CapabilitiesTool'
import ConfigTool from './components/ConfigTool'
import ConversationTool from './components/ConversationTool'
import EventsTool from './components/EventsTool'
import FrontendToolsTool from './components/FrontendToolsTool'
import HistoryTool from './components/HistoryTool'
import HostContextTool from './components/HostContextTool'
import InterruptHostTool from './components/InterruptHostTool'
import SessionTool from './components/SessionTool'
import ToolingHeader from './components/ToolingHeader'
import { getPanelWidth, setPanelWidth, subscribe } from './panelWidth'

interface Props {
	autoEvents: ToolCallbackEvent[]
	userEvents: ToolCallbackEvent[]
	windowControlsLog: string[]
	errorLog: string[]
	onContextChange: (context: Record<string, unknown>) => void
}

const Tooling = (props: Props) => {
	const { autoEvents, userEvents, windowControlsLog, errorLog, onContextChange } = props

	const width = useSyncExternalStore(subscribe, getPanelWidth)

	const startResize = (event: React.PointerEvent) => {
		event.preventDefault()

		const onMove = (move: PointerEvent) => setPanelWidth(window.innerWidth - move.clientX)

		const onUp = () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
		}

		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
	}

	return (
		<>
			<div
				role="separator"
				className="kd-resizer"
				aria-orientation="vertical"
				aria-label="Resize harness panel"
				onPointerDown={startResize}
			/>
			<aside className="kd-panel" style={{ width }}>
				<ToolingHeader />
				<SessionTool />
				<CapabilitiesTool />
				<FrontendToolsTool />
				<ConversationTool />
				<HostContextTool onContextChange={onContextChange} />
				<HistoryTool />
				<EventsTool
					errorLog={errorLog}
					autoEvents={autoEvents}
					userEvents={userEvents}
					windowControlsLog={windowControlsLog}
				/>
				<InterruptHostTool />
				<ConfigTool />
			</aside>
		</>
	)
}

export default Tooling
