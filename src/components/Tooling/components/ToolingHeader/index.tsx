import params from '../../../../params'

const ToolingHeader = () => {
	return (
		<div className="kd-panel-header">
			<span className="kd-panel-title">Kit Tooling</span>
			<span className="kd-chip kd-chip-accent">
				{params.explicitRunUrl
					? `runUrl → ${params.explicitRunUrl}`
					: params.proxyOrigin
						? `${params.agent} via proxy ${params.proxy} (${params.proxyAgent})`
						: params.agentVersion
							? `${params.agent} @v${params.agentVersion}`
							: params.agent}
			</span>
		</div>
	)
}

export default ToolingHeader
