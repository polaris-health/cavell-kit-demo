// One stylesheet: @cavell/kit bundles the kernel layer (ADR 0007 D1).
import '@cavell/kit/styles.css'
import './demo.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
