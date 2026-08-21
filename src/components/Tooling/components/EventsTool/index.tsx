import { ToolCallbackEvent } from '@cavell/kit'

import Section from '../shared/Section'
import CallbackFeed from './components/CallbackFeed'

interface Props {
	errorLog: string[]
	windowControlsLog: string[]
	autoEvents: ToolCallbackEvent[]
	userEvents: ToolCallbackEvent[]
}

const EventsTool = (props: Props) => {
	const { errorLog, windowControlsLog, autoEvents, userEvents } = props

	const noEvents =
		autoEvents.length === 0 && userEvents.length === 0 && windowControlsLog.length === 0 && errorLog.length === 0

	return (
		<Section title="Events">
			{noEvents ? <span className="kd-empty">no events yet</span> : null}
			<div className="kd-feed-block">
				<span className="kd-feed-label" id="kd-feed-auto">
					tool callbacks · auto
				</span>
				<CallbackFeed labelledBy="kd-feed-auto" events={autoEvents} withSource />
			</div>
			<div className="kd-feed-block">
				<span className="kd-feed-label" id="kd-feed-user">
					tool callbacks · user
				</span>
				<CallbackFeed labelledBy="kd-feed-user" events={userEvents} withSource={false} />
			</div>
			<div className="kd-feed-block">
				<span className="kd-feed-label" id="kd-feed-window-controls">
					window control intents
				</span>
				{/* role="log" names each append-only feed, which is what tells the four apart. */}
				<div className="kd-feed kd-feed-text" role="log" aria-labelledby="kd-feed-window-controls">
					{windowControlsLog.join(' | ')}
				</div>
			</div>
			<div className="kd-feed-block">
				<span className="kd-feed-label" id="kd-feed-on-error">
					onError
				</span>
				<div className="kd-feed kd-feed-text kd-feed-error" role="log" aria-labelledby="kd-feed-on-error">
					{errorLog.join(' | ')}
				</div>
			</div>
		</Section>
	)
}

export default EventsTool
