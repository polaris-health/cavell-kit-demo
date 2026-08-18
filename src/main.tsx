// One stylesheet: @cavell/kit bundles the kernel layer (ADR 0007 D1).
import '@cavell/kit/styles.css'
import './demo.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
