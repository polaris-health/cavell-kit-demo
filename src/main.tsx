// One stylesheet: @cavell/kit bundles the kernel layer (ADR 0007 D1).
import '@cavell/kit/styles.css'
import './demo.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import checkKitStylesheet from './devStylesheetCheck'
import installCreditBalanceMock from './mocks/creditBalance'

// Dropped from production builds, so the Playwright suites (which build the demo) never see it.
if (import.meta.env.DEV) {
	checkKitStylesheet()
}

// Harness-only, and inert until the Credits section's "mock balance" box is ticked.
installCreditBalanceMock()

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
