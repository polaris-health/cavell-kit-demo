/** Dev-only guard against the most common integration mistake: rendering kit components without
 *  `@cavell/kit/styles.css` on the page. Everything renders, nothing is styled, and nothing says why. */

interface Found {
	/** A `cavellkit`-namespaced selector — the stylesheet is present AND still prefixed. */
	prefixed: boolean
	/** `.ds-table` is hand-written CSS in the kit stylesheet that is never prefixed, so it tells
	 *  "stylesheet missing" apart from "stylesheet present but the prefix broke". */
	kitSheet: boolean
}

const scanRules = (rules: CSSRuleList, found: Found) => {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			found.prefixed ||= rule.selectorText.includes('cavellkit')
			found.kitSheet ||= rule.selectorText.includes('ds-table')
		}
		// Utilities live inside `@layer`, so grouping rules must be walked too.
		if ('cssRules' in rule) {
			scanRules((rule as CSSGroupingRule).cssRules, found)
		}
		if (found.prefixed && found.kitSheet) {
			return
		}
	}
}

const scanPage = (): Found => {
	const found: Found = { prefixed: false, kitSheet: false }
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			scanRules(sheet.cssRules, found)
		} catch {
			// Cross-origin sheets throw on cssRules — they are never ours.
		}
	}

	return found
}

/** Inline styles only: the banner has to survive the very failure it reports. */
const showBanner = (lines: string[]) => {
	const el = document.createElement('div')
	el.setAttribute('role', 'alert')
	el.textContent = lines.join('\n')
	Object.assign(el.style, {
		position: 'fixed',
		insetBlockStart: '0',
		insetInline: '0',
		zIndex: '2147483647',
		padding: '16px 20px',
		background: '#7f1d1d',
		color: '#ffffff',
		font: '13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
		whiteSpace: 'pre-wrap',
		boxShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
	} satisfies Partial<CSSStyleDeclaration>)
	document.body.appendChild(el)
}

/** Runs after first paint so the bundler has injected the stylesheets. Dev-only — see main.tsx. */
const checkKitStylesheet = () => {
	requestAnimationFrame(() => {
		const tokensLoaded = !!getComputedStyle(document.documentElement).getPropertyValue('--cavellkit-spacing').trim()
		const { prefixed, kitSheet } = scanPage()
		if (tokensLoaded && prefixed) {
			return
		}

		// The stylesheet is on the page but carries no `cavellkit` selectors — the Tailwind prefix broke,
		// so telling anyone to import the stylesheet would send them the wrong way.
		const lines = kitSheet
			? [
					'⚠  @cavell/kit styles are loaded but not namespaced',
					'',
					'No `cavellkit:` rules on the page — the stylesheet is stale or was built without its',
					'Tailwind prefix. Working inside the cavell monorepo? Rebuild the libraries:',
					'    yarn workspace @cavell/kernel build && yarn workspace @cavell/kit build',
				]
			: [
					'⚠  @cavell/kit styles are not loaded',
					'',
					'Add this to your entry file:',
					"    import '@cavell/kit/styles.css'",
					'',
					'(dev-only check from the reference demo — remove it in your own app)',
				]

		showBanner(lines)
		console.error(lines.join('\n'))
	})
}

export default checkKitStylesheet
