interface Props {
	label: string
	children: React.ReactNode
}

const Row = (props: Props) => {
	const { label, children } = props

	return (
		<div className="kd-row">
			<span className="kd-row-label">{label}</span>
			<span className="kd-row-value">{children}</span>
		</div>
	)
}

export default Row
