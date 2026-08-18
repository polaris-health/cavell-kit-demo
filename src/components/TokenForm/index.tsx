import { useState } from 'react'

import params from '../../params'
import reloadWithParams from '../../params/reloadWithParams'
import BackendSelect from '../BackendSelect'

const TokenForm = () => {
	const [token, setToken] = useState('')
	const [backend, setBackend] = useState(params.base)

	const handleOpen = () => {
		reloadWithParams({ token: token.trim(), base: backend })
	}

	return (
		<div className="kd-token-form">
			<h1>Cavell Kit Demo</h1>
			<label>
				backend <BackendSelect value={backend} onChange={setBackend} />
			</label>
			<input value={token} placeholder="Corilus opaque token" onChange={(e) => setToken(e.target.value)} />
			<button className="kd-btn kd-btn-primary" onClick={handleOpen}>
				Open
			</button>
		</div>
	)
}

export default TokenForm
