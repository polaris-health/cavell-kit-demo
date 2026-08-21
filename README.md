# cavell-kit-demo

The reference embedding of **`@cavell/kit`** — Cavell's embeddable AI-companion chat for React
hosts, by [Cavell](https://cavell.ai). This app mounts the full assistant surface
(`CavellProvider` + `CavellAssistant`) next to a harness panel that exercises the public API:
`useCavellCompanion`, client-executed tools (`useFrontendTool`), human-in-the-loop tools, custom
tool-call renderers, the conversation history list, feedback, and host context declarations
(patient / problem in focus).

## License

The example code in this repository is MIT-licensed. The `@cavell/kit` package it installs is
**proprietary software of Polaris Health BV** — using it requires written permission (see the
LICENSE inside the package). Contact Polaris Health to obtain access.

## Run it

Requirements: Node ≥ 22 (see `.nvmrc`), corepack (`corepack enable`).

```bash
yarn install
yarn dev          # http://localhost:5176
```

No credentials or registry setup needed: `.yarnrc.yml` in this repo already points the `@cavell`
scope at the Cavell registry for the environment this branch tracks, which is how `@cavell/kit`
resolves from the plain `^` range in `package.json`. Those two files are the whole install
contract — copy them into your own app, swapping the registry URL for the environment you build
against (the integration guide for each environment lists it).

Icons render as empty boxes and text falls back to system fonts until you supply the peer assets
— see below.

The demo takes all configuration from URL parameters (documented at the top of `src/App.tsx`).
You need a valid access token for the Cavell environment this branch tracks — paste it into the
token form, or pass it directly:

```
http://localhost:5176/?token=<your token>&agent=careconnect_gp
```

The token screen's **backend picker** (`?base=...`) selects which Cavell API origin to call;
tokens are per environment.

## Peer assets: icons and font

The kit renders icons as FontAwesome classes (`<i class="fa-light fa-…">`) and names Inter first
in its type stack, but it ships **neither**: FontAwesome Pro is licensed per customer and cannot
be redistributed, so a fresh checkout shows empty boxes where icons belong. `index.html` already
links the two paths this app expects, and `public/` starts empty:

```html
<link rel="stylesheet" href="/fonts/inter/inter.css" /> <link rel="stylesheet" href="/fa/css/all.min.css" />
```

Note that Vite's dev server answers a missing file under those paths with the app's HTML rather
than a 404, so the browser drops the stylesheet on a MIME-type mismatch — blank icons, no red
line in the network tab. The console message is the giveaway.

### FontAwesome Pro, option 1 — your Kit URL (nothing to install)

If your FontAwesome account has a Kit, hand the demo its script URL and the dev server injects it
into the page:

```bash
VITE_FA_URL=https://kit.fontawesome.com/<your-kit-code>.js yarn dev
```

`VITE_FA_URL` also accepts a stylesheet URL: anything ending in `.js` is injected as a `<script>`,
anything else as a `<link rel="stylesheet">`.

### FontAwesome Pro, option 2 — the npm package (self-hosted, bundled)

A Pro subscription includes a private npm registry token (fontawesome.com → Account → Tokens).
Point the `@fortawesome` scope at their registry in `.yarnrc.yml`:

```yaml
npmScopes:
    fortawesome:
        npmRegistryServer: 'https://npm.fontawesome.com/'
        npmAuthToken: '<your FA Pro token>'
```

Add it _beside_ the existing `cavell` entry — `npmScopes` is one key holding every scope, not one
block per scope. Keep the token out of version control: `YARN_NPM_AUTH_TOKEN` in the environment
works instead of the `npmAuthToken` line. Then install and import the stylesheet:

```bash
yarn add @fortawesome/fontawesome-pro
```

```ts
// src/main.tsx
import '@fortawesome/fontawesome-pro/css/all.min.css'
```

Vite bundles that CSS and emits the webfonts alongside it, so nothing needs to live in `public/`.
Remove the `/fa/css/all.min.css` `<link>` from `index.html` afterwards.

### FontAwesome Pro, option 3 — copy the files into `public/`

From your FontAwesome account, download **Font Awesome Pro for the Web** and copy two folders in.
They must stay siblings under `public/fa/` — `all.min.css` looks for its font files one level up,
in a `webfonts` folder next to `css` — so the layout is the contract:

```
public/fa/css/all.min.css
public/fa/webfonts/fa-light-300.woff2      ← the default family
public/fa/webfonts/fa-solid-900.woff2      ← used by a few components
public/fa/webfonts/fa-regular-400.woff2
public/fa/webfonts/fa-brands-400.woff2     ← optional
```

These are the paths `index.html` already requests, so this route needs no code change.

### Inter

Inter is free (SIL Open Font License), so self-hosting it is unrestricted. Simplest route, no
files to copy:

```bash
yarn add @fontsource/inter
```

```ts
// src/main.tsx — then remove the /fonts/inter/inter.css link from index.html
import '@fontsource/inter'
```

To serve it yourself instead, put the woff2 files under `public/fonts/inter/` and declare them in
`public/fonts/inter/inter.css` under the family name **`Inter`** (the type stack is
`'Inter UI', 'Inter', system-ui, …`):

```css
@font-face {
	font-family: 'Inter';
	font-style: normal;
	font-weight: 100 900; /* one variable file covers every weight */
	font-display: swap;
	src: url('./InterVariable.woff2') format('woff2');
}
```

`.gitignore` already excludes `public/fa`, `public/fonts` and `public/images`, so licensed files
you drop there cannot be committed by accident.

## Running a different kit release

`yarn dev` uses the `@cavell/kit` version in your lockfile — the release this branch was generated
against. To try another one without touching that lockfile:

```bash
yarn dev:qa                # latest qa release
yarn dev:staging           # latest staging release
yarn dev:prod              # latest production release
yarn dev:qa 1.2.3          # a specific version on that channel
```

Each command reads the channel's `latest.json`, downloads that release into the gitignored
`.cavell-kit-builds/` directory and points Vite at it — `package.json` and `yarn.lock` are left
alone, so switching back is just `yarn dev`. Cached builds are reused; released versions are
immutable, so a version you already have is the version you get.

(`yarn dev:remote` targets Cavell's internal dev channel, whose artifacts need Cavell AWS
credentials. The three commands above are public downloads.)

## What to look at

- `src/App.tsx` — the whole integration: provider setup, frontend tools, HITL, custom renderers,
  session list, feedback, context declarations. Written to be copied from.
- `public/README.md` — the peer-asset contract in one page (the paths, the folder layout, what
  happens without them).
- `package.json` + `.yarnrc.yml` — the dependency shape a host needs: `@cavell/kit` as a semver
  range, the `@cavell` scope pointed at this environment's registry, and the exact-version peers
  (`@copilotkit/react-core`, `@ag-ui/client`, `@ag-ui/core`) alongside `react`/`react-dom`/`zod`.

## Versioning

`package.json`'s `version` is the `@cavell/kit` release this commit was generated against, and the
`@cavell/kit` range was opened at that release — `yarn up @cavell/kit` moves you to the newest one
this channel offers within the range. The kit sends its version on every request
(`X-Cavell-Kit-Version`); the backend guarantees
backwards compatibility with every released version, and will answer with a structured
`client_outdated` error in the rare case a build is ever end-of-lifed — the surface then shows
an update-required notice.
