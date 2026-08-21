import { useCopilotKit } from '@cavell/kit'

import Section from '../shared/Section'

const FrontendToolsTool = () => {
	const { copilotkit } = useCopilotKit()

	const tools = copilotkit.tools
	const rendererNames = new Set(copilotkit.renderToolCalls.map((renderer) => renderer.name))

	return (
		<Section title={`Frontend tools · ${tools.length}`}>
			<div className="kd-tools">
				{tools.map((tool) => (
					<div key={tool.name} className="kd-tool">
						<div className="kd-tool-head">
							<code>{tool.name}</code>
							{rendererNames.has(tool.name) ? <span className="kd-chip kd-chip-on">renderer</span> : null}
						</div>
						{tool.description ? <p className="kd-tool-desc">{tool.description}</p> : null}
					</div>
				))}
			</div>
		</Section>
	)
}

export default FrontendToolsTool
