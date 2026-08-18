interface Props {
	title: string
	children: React.ReactNode
}

const Section = (props: Props) => {
	const { title, children } = props

	// aria-labelledby is what promotes a plain <section> to a named `region` landmark, so each
	// panel is addressable by its title instead of by a test-only attribute.
	const headingId = `kd-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

	return (
		<section className="kd-section" aria-labelledby={headingId}>
			<h2 className="kd-section-title" id={headingId}>
				{title}
			</h2>
			{children}
		</section>
	)
}

export default Section
