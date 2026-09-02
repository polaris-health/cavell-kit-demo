import { useState } from 'react'

import { useCavellCompanion } from '@cavell/kit'

import parsePatientId from '../../../../utils/parsePatientId'
import Row from '../shared/Row'
import Section from '../shared/Section'

interface Props {
	onContextChange: (newContext: Record<string, unknown>) => void
}

const HostContextTool = (props: Props) => {
	const { onContextChange } = props

	const { hostContext, pendingHostPatient, pendingHostProblem, sessionContext } = useCavellCompanion()

	const [patientIdDraft, setPatientIdDraft] = useState('')
	const [patientNameDraft, setPatientNameDraft] = useState('')
	const [patientInszDraft, setPatientInszDraft] = useState('')
	const [patientGenderDraft, setPatientGenderDraft] = useState('')

	const [problemDraft, setProblemDraft] = useState('')
	const [problemTermDraft, setProblemTermDraft] = useState('')

	const [specialtyDraft, setSpecialtyDraft] = useState('')

	const onRemoveField = (key: string) => {
		const newContext = { ...hostContext }
		delete newContext[key]
		onContextChange(newContext)
	}

	// The host-enriched patient declaration (MIGRATION.md contract): the id plus the display
	// fields the badge renders until the server enriches at the next run. Gender is a first-class
	// context element — the specialist note template reads it from the conversation context.
	const onSetPatient = (id: string, name: string, insz: string, gender: string) => {
		const newContext = { ...hostContext }
		delete newContext.patient_id
		delete newContext.patient_resource_id
		delete newContext.patient_name
		delete newContext.patient_insz
		delete newContext.patient_gender
		Object.assign(newContext, parsePatientId(id))
		if (name) {
			newContext.patient_name = name
		}
		if (insz) {
			newContext.patient_insz = insz
		}
		if (gender) {
			newContext.patient_gender = gender
		}
		onContextChange(newContext)
	}

	// Both id spellings must clear: a null resource id with a surviving numeric id still declares.
	const onClearPatient = () => {
		const newContext = { ...hostContext, patient_id: null, patient_resource_id: null } as Record<string, unknown>
		delete newContext.patient_name
		delete newContext.patient_insz
		delete newContext.patient_gender
		onContextChange(newContext)
	}

	// Host problem declaration: code + optional display term (a stale term never survives a switch).
	const onSetProblem = (code: string, term: string) => {
		const newContext = { ...hostContext, problem: code } as Record<string, unknown>
		if (term) {
			newContext.problem_term = term
		} else {
			delete newContext.problem_term
		}

		onContextChange(newContext)
	}

	// Declarative cleared hint, mirroring the ai-assistant host (null ≠ absent).
	const onClearProblem = () => {
		const newContext = { ...hostContext, problem: null } as Record<string, unknown>
		delete newContext.problem_term
		onContextChange(newContext)
	}

	// Caregiver identity is a non-clinical declaration — merged into the run context wholesale
	// (agui/context_sync.py), and the GP agent folds the specialty into its system prompt.
	const onSetSpecialty = (specialty: string) => {
		onContextChange({ ...hostContext, current_caregiver_speciality: specialty })
	}

	// Same null ≠ absent rule as patient/problem: dropping the key leaves the last merged value
	// standing in the conversation context, so clearing has to declare null.
	const onClearSpecialty = () => {
		onContextChange({ ...hostContext, current_caregiver_speciality: null })
	}

	const contextEntries = Object.entries(hostContext)

	return (
		<Section title="Host context">
			{contextEntries.length > 0 ? (
				<div className="kd-ctx-entries">
					{contextEntries.map(([key, value]) => (
						<div key={key} className="kd-ctx-entry">
							<code className="kd-ctx-entry-key">{key}</code>
							<code className="kd-ctx-entry-value">{JSON.stringify(value)}</code>
							<button
								className="kd-ctx-entry-remove"
								aria-label={`remove ${key}`}
								onClick={() => onRemoveField(key)}
							>
								✕
							</button>
						</div>
					))}
				</div>
			) : (
				<span className="kd-empty">no host-declared context</span>
			)}
			<div className="kd-composer kd-patient-controls">
				<input
					aria-label="patient id"
					value={patientIdDraft}
					placeholder="patient id (uuid or emr nr)"
					onChange={(e) => setPatientIdDraft(e.target.value)}
				/>
				<input
					aria-label="patient name"
					value={patientNameDraft}
					placeholder="name (optional)"
					onChange={(e) => setPatientNameDraft(e.target.value)}
				/>
			</div>
			<div className="kd-composer kd-patient-controls">
				<input
					aria-label="patient INSZ"
					value={patientInszDraft}
					placeholder="INSZ (optional)"
					onChange={(e) => setPatientInszDraft(e.target.value)}
				/>
				<select
					aria-label="patient gender"
					value={patientGenderDraft}
					onChange={(e) => setPatientGenderDraft(e.target.value)}
				>
					<option value="">gender (optional)</option>
					<option value="male">male</option>
					<option value="female">female</option>
					<option value="other">other</option>
					<option value="unknown">unknown</option>
				</select>
				<button
					className="kd-btn"
					onClick={() => {
						if (patientIdDraft.trim()) {
							onSetPatient(
								patientIdDraft.trim(),
								patientNameDraft.trim(),
								patientInszDraft.trim(),
								patientGenderDraft,
							)
						}
					}}
				>
					set patient
				</button>
				<button className="kd-btn" onClick={() => onClearPatient()}>
					clear patient
				</button>
			</div>
			{pendingHostPatient !== null ? (
				<Row label="pending patient">
					<code className="kd-code">{JSON.stringify(pendingHostPatient)}</code>
				</Row>
			) : null}
			<div className="kd-composer kd-problem-controls">
				<input
					aria-label="problem code"
					value={problemDraft}
					placeholder="problem code (e.g. K74)"
					onChange={(e) => setProblemDraft(e.target.value)}
				/>
				<input
					aria-label="problem term"
					value={problemTermDraft}
					placeholder="term (optional)"
					onChange={(e) => setProblemTermDraft(e.target.value)}
				/>
				<button className="kd-btn" onClick={() => onSetProblem(problemDraft, problemTermDraft.trim())}>
					set problem
				</button>
				<button className="kd-btn" onClick={() => onClearProblem()}>
					clear problem
				</button>
			</div>
			{pendingHostProblem !== null ? (
				<Row label="pending problem">
					<code className="kd-code">{JSON.stringify(pendingHostProblem)}</code>
				</Row>
			) : null}
			<div className="kd-composer kd-caregiver-controls">
				<input
					aria-label="caregiver specialty"
					value={specialtyDraft}
					placeholder="caregiver specialty (e.g. Cardiology)"
					onChange={(e) => setSpecialtyDraft(e.target.value)}
				/>
				<button className="kd-btn" onClick={() => onSetSpecialty(specialtyDraft.trim())}>
					set specialty
				</button>
				<button className="kd-btn" onClick={() => onClearSpecialty()}>
					clear specialty
				</button>
			</div>
			<span className="kd-feed-label">resolved session context (server)</span>
			<div className="kd-json">{JSON.stringify(sessionContext)}</div>
		</Section>
	)
}

export default HostContextTool
