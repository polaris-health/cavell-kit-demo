// Fetch a released @cavell/kit build and make it usable by the dev server.
//
// Every release lands as an immutable, versioned tarball in one of four channels; `latest.json` is
// the only mutable object and names the current version. This module resolves a channel (+ optional
// version) to a local directory holding that exact build, ready for the Vite alias in
// vite.config.ts. `scripts/use-kit.mjs` is the command-line front end.
//
// Downloaded builds are cached under `.cavell-kit-builds/<channel>/<version>/` and never
// overwritten — versions are immutable, so a cached build is the build.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.join(scriptsDir, '..')
const cacheDir = path.join(appDir, '.cavell-kit-builds')

/**
 * The release channels. `dev` is the exception: its artifacts are readable with Cavell AWS
 * credentials only (the CDN serves its `latest.json` and refuses the rest), because dev builds are
 * per-merge snapshots rather than releases. qa/staging/prod are plain public downloads.
 */
export const CHANNELS = {
	dev: { bucket: 'dev-cavell-kit-builds', origin: 'https://dev.cavell-kit.corilus.cavell.app', iamOnly: true },
	qa: { bucket: 'qa-cavell-kit-builds', origin: 'https://qa.cavell-kit.corilus.cavell.app' },
	staging: { bucket: 'stg-cavell-kit-builds', origin: 'https://staging.cavell-kit.corilus.cavell.app' },
	prod: { bucket: 'cavell-kit-builds', origin: 'https://cavell-kit.corilus.cavell.app' },
}

/** Thrown for every expected failure (bad channel, no such version, no credentials, …). */
export class KitSourceError extends Error {}

const fail = (message) => {
	throw new KitSourceError(message)
}

const channelConfig = (channel) => {
	const config = CHANNELS[channel]
	if (!config) {
		fail(`unknown channel ${JSON.stringify(channel)} — expected one of ${Object.keys(CHANNELS).join(', ')}`)
	}

	return config
}

const buildKey = (version) => `builds/${version}/cavell-kit-${version}.tgz`

const CREDENTIALS_HINT =
	'  dev-channel builds are readable with Cavell AWS credentials only (the AWS CLI must be installed\n' +
	'  and logged in). The qa, staging and prod channels are public downloads and need none.'

const aws = (args, what, missingMessage) => {
	try {
		return execFileSync('aws', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	} catch (error) {
		const detail = (error.stderr ?? '').toString().trim() || error.message
		if (missingMessage && /\(404\)|NoSuchKey|does not exist/.test(detail)) {
			return fail(missingMessage)
		}

		return fail(`${what} failed: ${detail}\n${CREDENTIALS_HINT}`)
	}
}

/** The version `latest.json` currently points at, with the checksum to verify the download against. */
export const fetchLatest = async (channel) => {
	const { origin } = channelConfig(channel)
	const url = `${origin}/latest.json`
	const response = await fetch(url).catch((error) => fail(`could not reach ${url}: ${error.message}`))
	if (!response.ok) {
		fail(`${url} answered HTTP ${response.status} — nothing published to the ${channel} channel yet?`)
	}

	return response.json()
}

/** Every version published to a channel, newest last. Needs Cavell AWS credentials. */
export const listVersions = (channel) => {
	const { bucket } = channelConfig(channel)
	const out = aws(['s3', 'ls', `s3://${bucket}/builds/`], `listing ${channel} builds`)

	return out
		.split('\n')
		.map((line) => line.trim().match(/^PRE\s+(.+)\/$/)?.[1])
		.filter(Boolean)
		.sort()
}

const download = async (channel, version, dest) => {
	const { bucket, origin, iamOnly } = channelConfig(channel)
	mkdirSync(path.dirname(dest), { recursive: true })

	if (iamOnly) {
		aws(
			['s3', 'cp', `s3://${bucket}/${buildKey(version)}`, dest, '--only-show-errors'],
			`downloading ${version}`,
			`${version} is not published on the ${channel} channel (\`use-kit.mjs ${channel} --list\` prints what is)`,
		)

		return
	}

	const url = `${origin}/${buildKey(version)}`
	const response = await fetch(url).catch((error) => fail(`could not reach ${url}: ${error.message}`))
	if (!response.ok) {
		fail(`${url} answered HTTP ${response.status} — ${version} is not published on the ${channel} channel`)
	}
	writeFileSync(dest, Buffer.from(await response.arrayBuffer()))
}

const verify = (file, expected) => {
	const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
	if (actual !== expected) {
		fail(`checksum mismatch on ${path.basename(file)} (expected ${expected}, got ${actual})`)
	}
}

// Yarn treats any directory with a yarn.lock as a project of its own, so the kit and its runtime
// dependencies land HERE and the app's own node_modules is left untouched — switching builds never
// touches package.json or the lockfile.
//
// Peer dependencies (react, react-dom, CopilotKit, AG-UI) are deliberately NOT installed: Node
// resolves them from the app's node_modules instead, which is what keeps a single React — and a
// single CopilotKit core — in the browser.
const install = (dir, tarball) => {
	writeFileSync(
		path.join(dir, 'package.json'),
		`${JSON.stringify(
			{
				name: 'cavell-kit-build',
				private: true,
				version: '0.0.0',
				dependencies: { '@cavell/kit': `file:./${path.basename(tarball)}` },
			},
			null,
			'\t',
		)}\n`,
	)
	writeFileSync(path.join(dir, 'yarn.lock'), '')
	writeFileSync(
		path.join(dir, '.yarnrc.yml'),
		[
			'nodeLinker: node-modules',
			'enableImmutableInstalls: false',
			// The unmet peers above are the point of this install, not a problem to report.
			'logFilters:',
			'  - code: YN0002',
			'    level: discard',
			'  - code: YN0086',
			'    level: discard',
			'',
		].join('\n'),
	)
	// Yarn's own progress goes to stderr with everything else this module says, so stdout stays
	// clean for `use-kit.mjs --print-dir`.
	execFileSync('yarn', ['install'], { cwd: dir, stdio: ['ignore', 2, 'inherit'] })
}

/**
 * Resolve a channel (+ optional version) to a local directory containing that @cavell/kit build,
 * downloading and installing it on first use. Returns `{ channel, version, kitDir, cached }`.
 */
export const prepareKit = async (channel, requestedVersion, log = () => {}) => {
	channelConfig(channel)

	let version = requestedVersion
	let sha256
	if (version) {
		log(`resolving @cavell/kit ${version} on the ${channel} channel`)
	} else {
		const latest = await fetchLatest(channel)
		version = latest.version
		sha256 = latest.sha256
		log(`latest ${channel} release is @cavell/kit ${version}`)
	}

	const dir = path.join(cacheDir, channel, version)
	const kitDir = path.join(dir, 'node_modules', '@cavell', 'kit')
	if (existsSync(path.join(kitDir, 'dist', 'index.js'))) {
		return { channel, version, kitDir, cached: true }
	}

	rmSync(dir, { recursive: true, force: true }) // an interrupted earlier attempt
	const tarball = path.join(dir, `cavell-kit-${version}.tgz`)
	log(`downloading ${path.basename(tarball)}`)
	await download(channel, version, tarball)
	if (sha256) {
		verify(tarball, sha256)
	}

	log('installing it and its dependencies')
	install(dir, tarball)
	if (!existsSync(path.join(kitDir, 'dist', 'index.js'))) {
		fail(`install produced no @cavell/kit build in ${dir}`)
	}

	return { channel, version, kitDir, cached: false }
}
