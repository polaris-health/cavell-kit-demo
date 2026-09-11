import { useCavellCompanion, useDictationLevel } from '@cavell/kit'

import Flag from '../shared/Flag'
import Row from '../shared/Row'
import Section from '../shared/Section'

/** Exercises the composer-dictation surface (ADR 0013): `useCavellCompanion().dictation`, the
 *  imperative API a host composing its own composer would drive. The capability follows the kit's
 *  own default (OFF) — turn it on via the config panel's `dictation` toggle or
 *  `?caps={"dictation":true}`. The microphone is always the system default: there is no picker.
 *  Without the capability the buttons are warning no-ops. */
const DictationTool = () => {
	const { capabilities, dictation } = useCavellCompanion()
	// The live microphone level rides its own subscription, not the store (it updates ~20x/s).
	const level = useDictationLevel()

	return (
		<Section title="Dictation">
			<div className="kd-chips">
				<Flag label="dictation" showActive={capabilities.dictation} />
				<Flag label="listening" showActive={dictation.mode === 'transcribe'} />
				<Flag label="limit reached" showActive={dictation.limitReached} />
			</div>
			<Row label="mode">{dictation.mode}</Row>
			<Row label="connecting">{dictation.connecting ? 'yes' : 'no'}</Row>
			<Row label="mic level">{Math.round(level * 100)}%</Row>
			<Row label="transcript">{dictation.transcript || '—'}</Row>
			{dictation.error ? <Row label="error">{dictation.error}</Row> : null}
			<div className="kd-btn-row">
				<button className="kd-btn" onClick={() => void dictation.start()}>
					Start dictation
				</button>
				<button className="kd-btn" onClick={() => void dictation.stop()}>
					Stop dictation
				</button>
				<button className="kd-btn" onClick={dictation.cancel}>
					Cancel dictation
				</button>
			</div>
		</Section>
	)
}

export default DictationTool
