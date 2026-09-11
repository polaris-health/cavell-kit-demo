import { RUN_PROXIES, isRunProxyKey } from '../../params/typeguards'

interface Props {
	value: string
	onChange: (value: string) => void
}

/** The CareConnect AI smart proxy per environment — BackendSelect's twin for `?proxy=`. */
const ProxySelect = (props: Props) => {
	const { value, onChange } = props

	// A `proxy` matching no key is a literal origin — keep it selectable so it isn't silently lost.
	const customProxy = value !== '' && !isRunProxyKey(value)

	return (
		<select value={value} onChange={(e) => onChange(e.target.value)} aria-label="run proxy">
			{RUN_PROXIES.map((proxy) => (
				<option key={proxy.key} value={proxy.key}>
					{proxy.label}
				</option>
			))}
			{customProxy ? <option value={value}>{value}</option> : null}
		</select>
	)
}

export default ProxySelect
