/** Apply a config change by navigating: the kit builds its run transport once per provider instance
 *  (ADR 0005 D3), so targeting params only take effect on a fresh mount — never a pushState. */
const reloadWithParams = (updates: Record<string, string>) => {
	const url = new URL(window.location.href)

	// An empty value deletes its param; params absent from `updates` are left alone, which is how
	// ?patient=/?problem=/?nonce= survive a reload from the config panel.
	for (const [key, value] of Object.entries(updates)) {
		if (value) {
			url.searchParams.set(key, value)
		} else {
			url.searchParams.delete(key)
		}
	}

	window.location.href = url.toString()
}

export default reloadWithParams
