# Peer assets (bring your own)

The kit deliberately bundles no licensed assets. For the demo to render as designed, serve:

- **FontAwesome Pro Kit CSS** — components render `<i class="fa-light fa-...">` glyphs
  (light family by default; solid/regular accepted). You need your own FA Pro license:
  either a FA Kit `<script>` tag in `index.html` or self-hosted
  `@fortawesome/fontawesome-pro` CSS imported in `src/main.tsx`.
- **Inter font** — the token stack is `'Inter UI', 'Inter', system-ui, ...`; without it the
  UI falls back to system fonts.
- **`images/logo.svg`** — place your logo at `public/images/logo.svg` (this exact path is
  the `CavellLogo` default).

Without these the demo still works — icons render as empty boxes and fonts fall back.
