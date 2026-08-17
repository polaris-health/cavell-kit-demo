# Peer assets (bring your own)

The kit deliberately bundles no licensed assets, so this folder starts empty and the two
`<link>`s in `index.html` resolve to nothing on a fresh checkout. **That is expected** — the
demo still runs; icons render as empty boxes and the font falls back. (Vite's dev server answers
those two paths with the app's HTML rather than a 404, so the browser drops them on a MIME
mismatch instead of showing a red 404 — look for that in the console.) To render as designed:

- **FontAwesome Pro** (your own license) — components emit `<i class="fa-light fa-...">`
  glyphs, so the page must load an FA that defines them. Either hand the dev server your Kit
  URL, `VITE_FA_URL=https://kit.fontawesome.com/<your-kit-code>.js yarn dev`, or self-host:

  ```
  public/fa/css/all.min.css
  public/fa/webfonts/fa-light-300.woff2      <- the default family
  public/fa/webfonts/fa-solid-900.woff2      <- used by a few components
  public/fa/webfonts/fa-regular-400.woff2
  public/fa/webfonts/fa-brands-400.woff2     <- optional
  ```

  `css/` and `webfonts/` MUST stay siblings under `public/fa/`: `all.min.css` looks for
  its font files one level up, in a `webfonts` folder next to `css`.
- **Inter** (free, SIL OFL) — the type stack is `'Inter UI', 'Inter', system-ui, ...`. Put the
  woff2 files here and declare them under the family name `Inter` in
  `public/fonts/inter/inter.css`.

Nothing else is host-provided: the Cavell logo is bundled into the kit, and
`@cavell/kit/styles.css` carries every token, reset rule and component style.

The repo README walks through all three FontAwesome routes (Kit URL, the `@fortawesome` npm
package, or these files) and the two Inter routes, with the exact commands.
