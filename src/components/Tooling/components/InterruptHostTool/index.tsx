import { useInterrupt } from '@cavell/kit'

/** Spec-standard AG-UI interrupts (generic agents / nativeHitl off). The kit
 *  surface does not host CopilotKit's interrupt element, so renderInChat:false
 *  and the host places the element itself. */
const InterruptHostTool = () => {
	const element = useInterrupt({
		renderInChat: false,
		render: ({ event, resolve }) => (
			<div className="kd-interrupt-card" role="group" aria-label={`interrupt ${event.name}`}>
				<code>{JSON.stringify(event.value)}</code>
				<button className="kd-btn kd-btn-primary" onClick={() => void resolve('go-ahead')}>
					resolve interrupt
				</button>
			</div>
		),
	})

	return element
}

export default InterruptHostTool
