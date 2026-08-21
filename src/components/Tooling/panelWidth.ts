/** The harness panel width, kept in localStorage so it survives the config-panel reloads. An
 *  external store rather than useState: the `storage` event syncs it across tabs for free. */

const STORAGE_KEY = 'kd-panel-width'
const DEFAULT_WIDTH = 460
const PANEL_MIN = 320
/** The assistant may shrink to its embedded-EHR side-panel width — dragging the resizer far
 *  left is exactly how you preview the companion form factor. */
const ASSISTANT_MIN = 340

const clampPanelWidth = (width: number): number =>
	Math.min(window.innerWidth - ASSISTANT_MIN, Math.max(PANEL_MIN, width))

const read = (): number => {
	const stored = Number(localStorage.getItem(STORAGE_KEY))

	return Number.isFinite(stored) && stored > 0 ? clampPanelWidth(stored) : DEFAULT_WIDTH
}

// Cached, because getSnapshot must return a stable value between notifications — re-reading would
// re-clamp against a live window.innerWidth and re-render forever.
let snapshot = read()

const listeners = new Set<() => void>()

const emit = () => {
	for (const listener of listeners) {
		listener()
	}
}

/** Fires only in OTHER tabs — this tab's own writes notify through setPanelWidth. */
const onStorage = (event: StorageEvent) => {
	if (event.key !== STORAGE_KEY) {
		return
	}

	snapshot = read()
	emit()
}

export const subscribe = (listener: () => void) => {
	if (listeners.size === 0) {
		window.addEventListener('storage', onStorage)
	}
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
		if (listeners.size === 0) {
			window.removeEventListener('storage', onStorage)
		}
	}
}

export const getPanelWidth = (): number => snapshot

export const setPanelWidth = (width: number) => {
	const next = clampPanelWidth(width)
	if (next === snapshot) {
		return
	}

	snapshot = next
	localStorage.setItem(STORAGE_KEY, String(next))
	emit()
}
