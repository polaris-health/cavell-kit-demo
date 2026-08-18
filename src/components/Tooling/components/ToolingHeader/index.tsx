import params from '../../../../params'

const ToolingHeader = () => {
	return (
		<div className="kd-panel-header">
			<span className="kd-panel-title">Kit Tooling</span>
			<span className="kd-chip kd-chip-accent">{params.runUrl ? `runUrl → ${params.runUrl}` : params.agent}</span>
		</div>
	)
}

export default ToolingHeader
