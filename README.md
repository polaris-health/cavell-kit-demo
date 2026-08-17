# cavell-kit-demo

The reference embedding of **`@cavell/kit`** — Cavell's embeddable AI-companion chat for React
hosts, by [Polaris Health](https://polaris-health.ai). This app mounts the full assistant surface
(`CavellProvider` + `CavellAssistant`) next to a harness panel that exercises the public API:
`useCavellCompanion`, client-executed tools (`useFrontendTool`), human-in-the-loop tools, custom
tool-call renderers, the conversation history list, feedback, and host context declarations
(patient / problem in focus).

> **This repository is a generated, read-only mirror.** Each branch tracks a Cavell release
> environment — `qa`, `staging`, and `main` → production — and every release lands as one commit. Branches are generated independently and must never be merged into each
> other; version tags (`v1.x.y`) live on `main`. Issues are welcome; pull requests cannot be
> accepted here.

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

The demo takes all configuration from URL parameters (documented at the top of `src/App.tsx`).
You need a valid access token for the Cavell environment this branch tracks — paste it into the
token form, or pass it directly:

```
http://localhost:5176/?token=<your token>&agent=careconnect_gp
```

The token screen's **backend picker** (`?base=...`) selects which Cavell API origin to call;
tokens are per environment.

### Running a different kit release

`yarn dev` uses the `@cavell/kit` version pinned in `package.json` — the release this branch was
generated against. To try another one without touching your lockfile:

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
- `public/README.md` — the peer-asset contract (FontAwesome Pro, Inter, logo): the kit bundles
  no licensed assets; the host page provides them.
- `package.json` — the dependency shape a host needs: `@cavell/kit` (pinned to this branch's
  released build) plus the exact-version peers (`@copilotkit/react-core`, `@ag-ui/client`,
  `@ag-ui/core`) and `react`/`react-dom`/`zod`.

## Versioning

`package.json`'s `version` is the `@cavell/kit` release this commit was generated against. The
kit sends that version on every request (`X-Cavell-Kit-Version`); the backend guarantees
backwards compatibility with every released version, and will answer with a structured
`client_outdated` error in the rare case a build is ever end-of-lifed — the surface then shows
an update-required notice.
