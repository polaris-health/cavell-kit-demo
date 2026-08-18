import { useState } from 'react'

import { useCavellCompanion } from '@cavell/kit'

import Row from '../shared/Row'
import Section from '../shared/Section'

const ConversationTool = () => {
	const { timeline, feedbackSent, starters, followups, send, sendFeedback, stop, newConversation } =
		useCavellCompanion()

	const [draft, setDraft] = useState('')

	const sendMessageToConversation = (text: string) => {
		if (text.trim()) {
			send(text)
		}
	}

	const rateLastConversationMessage = (rating: 'up' | 'down') => {
		if (lastAssistantMessage) {
			sendFeedback({ rating, target: { messageId: lastAssistantMessage.id } })
		}
	}

	const ratedIds = Object.keys(feedbackSent)
	const lastAssistantMessage = [...timeline]
		.reverse()
		.find((entry) => entry.kind === 'message' && entry.type === 'assistant')

	return (
		<Section title="Compose">
			<div className="kd-composer">
				<input
					aria-label="message the agent"
					value={draft}
					placeholder="message the agent…"
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							sendMessageToConversation(draft)
							setDraft('')
						}
					}}
				/>
				<button
					className="kd-btn kd-btn-primary"
					onClick={() => {
						sendMessageToConversation(draft)
						setDraft('')
					}}
				>
					send
				</button>
			</div>
			<div className="kd-btn-row">
				<button className="kd-btn" onClick={() => stop()}>
					stop run
				</button>
				<button className="kd-btn" onClick={() => newConversation()}>
					new conversation
				</button>
				<button
					aria-label="thumbs up"
					className="kd-btn"
					disabled={!lastAssistantMessage}
					onClick={() => rateLastConversationMessage('up')}
				>
					👍
				</button>
				<button
					aria-label="thumbs down"
					className="kd-btn"
					disabled={!lastAssistantMessage}
					onClick={() => rateLastConversationMessage('down')}
				>
					👎
				</button>
			</div>
			{starters.length > 0 ? (
				<div className="kd-chips" role="group" aria-label="starters">
					{starters.map((starter) => (
						<button
							key={starter.question}
							className="kd-suggestion"
							title={starter.topic}
							onClick={() => sendMessageToConversation(starter.question)}
						>
							{starter.question}
						</button>
					))}
				</div>
			) : null}
			{followups.length > 0 ? (
				<div className="kd-chips" role="group" aria-label="follow-ups">
					{followups.map((followup) => (
						<button
							key={followup}
							className="kd-suggestion"
							onClick={() => sendMessageToConversation(followup)}
						>
							{followup}
						</button>
					))}
				</div>
			) : null}
			{ratedIds.length > 0 ? (
				<Row label="rated">
					<code className="kd-code">{ratedIds.join(' | ')}</code>
				</Row>
			) : null}
		</Section>
	)
}

export default ConversationTool
