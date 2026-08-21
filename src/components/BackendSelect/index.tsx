import { BACKENDS, isBackendKey } from '../../params/typeguards'

interface Props {
	value: string
	onChange: (value: string) => void
}

const BackendSelect = (props: Props) => {
	const { value, onChange } = props

	// A `base` matching no key is a literal origin — keep it selectable so it isn't silently lost.
	const customBackend = value !== '' && !isBackendKey(value)

	return (
		<select value={value} onChange={(e) => onChange(e.target.value)}>
			{BACKENDS.map((backend) => (
				<option key={backend.key} value={backend.key === 'local' ? '' : backend.key}>
					{backend.label}
				</option>
			))}
			{customBackend ? <option value={value}>{value}</option> : null}
		</select>
	)
}

export default BackendSelect
