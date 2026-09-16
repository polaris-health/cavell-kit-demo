import { useState } from 'react'

import { NOTE_VERBOSITIES, type NoteVerbosity, useCavellCompanion, useRecordingLevel } from '@cavell/kit'

import Flag from '../shared/Flag'
import Row from '../shared/Row'
import Section from '../shared/Section'

interface Props {
	/** onRecordingStateChange entries from the provider — the host-side state stream (ADR 0008). */
	recordingLog: string[]
	/** Comma-separated ASR vocabulary fed to `recording.getDifficultWords` (App owns the state —
	 *  the getter is resolved at every recording start). */
	difficultWords: string
	onDifficultWordsChange: (words: string) => void
	/** JSON array of FHIR resources fed to `recording.getContext` — the RECOMMENDED channel
	 *  (Patient + current Medication resources; the ASR derives its vocabulary from them). */
	recordingContext: string
	onRecordingContextChange: (context: string) => void
}

const validContextJson = (raw: string): boolean => {
	try {
		return Array.isArray(JSON.parse(raw))
	} catch {
		return false
	}
}

/** Exercises the consultation-recording surface (ADR 0008): the imperative API on
 *  useCavellCompanion().recording, plus the provider's onRecordingStateChange stream.
 *  The capability follows the kit's own default (OFF) — turn it on via the config
 *  panel's `recording` toggle or `?caps={"recording":true}` against careconnect_gp,
 *  the agent that carries the note-generation skill server-side. Without the
 *  capability the buttons are warning no-ops. */
const RecordingTool = (props: Props) => {
	const { recordingLog, difficultWords, onDifficultWordsChange, recordingContext, onRecordingContextChange } = props

	const { capabilities, recording } = useCavellCompanion()
	// The live microphone level rides its own subscription, not the store (it updates ~20x/s).
	const level = useRecordingLevel()

	const [verbosity, setVerbosity] = useState<NoteVerbosity>('medium')

	return (
		<Section title="Recording">
			<div className="kd-chips">
				<Flag label="recording" showActive={capabilities.recording} />
				<Flag label="active" showActive={recording.active} />
				<Flag label="volume ok" showActive={recording.volumeOk} />
			</div>
			<Row label="status">{recording.status}</Row>
			<Row label="duration">{Math.round(recording.durationMs / 1000)}s</Row>
			<Row label="segments">{recording.segments.length}</Row>
			<Row label="mic level">{Math.round(level * 100)}%</Row>
			{recording.error ? <Row label="error">{recording.error}</Row> : null}
			{/* Both apply at the NEXT recording start (the getters are fetched per start). The context
			    should hold the FHIR Patient + the patient's current Medication resources. */}
			<label className="kd-recording-context">
				recording context (FHIR)
				<textarea
					value={recordingContext}
					rows={3}
					spellCheck={false}
					placeholder='[{ "resourceType": "Patient", … }]'
					onChange={(e) => onRecordingContextChange(e.target.value)}
				/>
			</label>
			{validContextJson(recordingContext) ? null : (
				<p className="kd-alert" role="alert">
					recording context: not a JSON array
				</p>
			)}
			<div className="kd-composer">
				<input
					aria-label="difficult words"
					placeholder="difficult words (comma-separated)"
					value={difficultWords}
					onChange={(e) => onDifficultWordsChange(e.target.value)}
				/>
			</div>
			<div className="kd-btn-row">
				<button className="kd-btn" onClick={() => void recording.start()}>
					Start recording
				</button>
				<button className="kd-btn" onClick={recording.pause}>
					Pause
				</button>
				<button className="kd-btn" onClick={recording.resume}>
					Resume
				</button>
				<button className="kd-btn" onClick={() => void recording.stop()}>
					Stop
				</button>
				<button className="kd-btn" onClick={recording.abort}>
					Discard
				</button>
			</div>
			<div className="kd-btn-row">
				<select
					aria-label="note verbosity"
					value={verbosity}
					onChange={(e) => setVerbosity(e.target.value as NoteVerbosity)}
				>
					{NOTE_VERBOSITIES.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
				<button className="kd-btn kd-btn-primary" onClick={() => void recording.generateNote(verbosity)}>
					Generate note
				</button>
			</div>
			<div className="kd-feed" role="log" aria-label="recording state feed">
				{recordingLog.map((entry, index) => (
					<div key={index} className="kd-feed-entry">
						{entry}
					</div>
				))}
			</div>
		</Section>
	)
}

export default RecordingTool
