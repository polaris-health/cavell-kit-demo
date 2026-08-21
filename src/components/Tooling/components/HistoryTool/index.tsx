import { useState } from 'react'

import { SessionSummary, sessionThreadId, useCavellCompanion } from '@cavell/kit'

import Section from '../shared/Section'

const HistoryTool = () => {
	const { listSessions, openConversation } = useCavellCompanion()

	const [threadDraft, setThreadDraft] = useState('')

	const [sessions, setSessions] = useState<SessionSummary[] | null>(null)

	const refreshSessions = async () => {
		const page = await listSessions(1, 30)
		setSessions(page.sessions)
	}

	return (
		<Section title="History">
			<div className="kd-composer">
				<input
					aria-label="thread id"
					value={threadDraft}
					placeholder="thread id"
					onChange={(e) => setThreadDraft(e.target.value)}
				/>
				<button className="kd-btn" onClick={() => openConversation(threadDraft.trim())}>
					open
				</button>
				<button className="kd-btn" onClick={() => refreshSessions()}>
					list sessions
				</button>
			</div>
			{sessions !== null ? (
				<div className="kd-sessions">
					{sessions.length === 0 ? <span className="kd-empty">no conversations</span> : null}
					{sessions.map((session) => (
						<button
							key={session.session_id}
							className="kd-session-row"
							onClick={() => openConversation(sessionThreadId(session))}
						>
							<span className="kd-session-preview">{session.preview ?? '(no preview)'}</span>
							<code className="kd-session-id">{sessionThreadId(session)}</code>
						</button>
					))}
				</div>
			) : null}
		</Section>
	)
}

export default HistoryTool
