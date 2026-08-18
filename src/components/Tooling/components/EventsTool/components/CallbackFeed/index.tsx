import { ToolCallbackEvent } from '@cavell/kit'

interface Props {
	/** Id of the caption naming this feed — what makes the four feeds tell-apart-able. */
	labelledBy: string
	events: ToolCallbackEvent[]
	withSource: boolean
}

const CallbackFeed = (props: Props) => {
	const { labelledBy, events, withSource } = props

	return (
		<div className="kd-feed" role="log" aria-labelledby={labelledBy}>
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

export default CallbackFeed
