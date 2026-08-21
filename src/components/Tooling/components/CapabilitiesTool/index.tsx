import { useCavellCompanion } from '@cavell/kit'

import Flag from '../shared/Flag'
import Section from '../shared/Section'

const CapabilitiesTool = () => {
	const { capabilities } = useCavellCompanion()

	return (
		<Section title="Capabilities">
			<div className="kd-chips">
				<Flag label="sessions" showActive={capabilities.sessions} />
				<Flag label="feedback" showActive={capabilities.feedback} />
				<Flag label="starters" showActive={capabilities.starters} />
				<Flag label="native HITL" showActive={capabilities.nativeHitl} />
			</div>
		</Section>
	)
}

export default CapabilitiesTool
