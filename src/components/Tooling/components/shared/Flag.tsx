interface Props {
	label: string
	showActive: boolean
}

const Flag = (props: Props) => {
	const { label, showActive } = props

	// State is spelled out rather than carried by the chip colour alone: colour on its own is
	// invisible to screen readers (WCAG 1.4.1) and to the Playwright suites.
	return (
		<span className={`kd-chip ${showActive ? 'kd-chip-on' : 'kd-chip-off'}`}>
			{label}: {showActive ? 'yes' : 'no'}
		</span>
	)
}

export default Flag
