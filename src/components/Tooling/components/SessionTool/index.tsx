import { useCavellCompanion } from '@cavell/kit'

import Flag from '../shared/Flag'
import Row from '../shared/Row'
import Section from '../shared/Section'

const SessionTool = () => {
	const { phase, threadId, locale, timeline, runActive, awaitingHuman, stopped, sessionExpired, runError } =
		useCavellCompanion()

	return (
		<Section title="Session">
			<Row label="phase">
				<span className={`kd-chip kd-phase-${phase}`}>{phase}</span>
			</Row>
			<Row label="thread">
				<code className="kd-code">{threadId}</code>
			</Row>
			<Row label="locale · timeline">
				<span className="kd-chip kd-chip-on">{locale}</span>{' '}
				<span className="kd-code">{timeline.length} entries</span>
			</Row>
			<div className="kd-chips">
				<Flag label="run active" showActive={runActive} />
				<Flag label="awaiting human" showActive={awaitingHuman} />
				<Flag label="stopped" showActive={stopped} />
				<Flag label="expired" showActive={sessionExpired} />
			</div>
			{runError !== null ? (
				<div className="kd-alert" role="alert">
					{runError}
				</div>
			) : null}
		</Section>
	)
}

export default SessionTool
