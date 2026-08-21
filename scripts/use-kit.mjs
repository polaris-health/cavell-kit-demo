#!/usr/bin/env node
// Run this demo against a RELEASED @cavell/kit build instead of the one in node_modules.
//
//   node scripts/use-kit.mjs <dev|qa|staging|prod> [version] [options] [-- vite args]
//
//     --list        print the versions published to the channel instead of starting anything
//     --print-dir   print the resolved build directory and exit (progress goes to stderr)
//
// The package.json scripts are the intended entry points:
//
//   yarn dev:remote          latest dev build        yarn dev:remote 1.0.0-a1b2c3d
//   yarn dev:qa              latest qa release       yarn dev:qa 1.2.3
//   yarn dev:staging         latest staging release  yarn dev:staging 1.2.3
//   yarn dev:prod            latest production release
//
// The selected build is handed to Vite through CAVELL_KIT_DIR, which vite.config.ts turns into an
// alias for `@cavell/kit`. Nothing in package.json or the lockfile changes, so switching channels
// is instant and leaves no trace.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CHANNELS, KitSourceError, listVersions, prepareKit } from './kit-source.mjs'

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const argv = process.argv.slice(2)
const viteArgs = argv.includes('--') ? argv.slice(argv.indexOf('--') + 1) : []
const own = argv.includes('--') ? argv.slice(0, argv.indexOf('--')) : argv
const flags = own.filter((arg) => arg.startsWith('-'))
const [channel, version, ...extra] = own.filter((arg) => !arg.startsWith('-'))

const usage = [
	'usage: use-kit.mjs <dev|qa|staging|prod> [version] [--list] [--print-dir] [-- vite args]',
	`       channels: ${Object.keys(CHANNELS).join(', ')}`,
].join('\n')

const die = (message) => {
	console.error(`✗ ${message}`)
	process.exit(1)
}

if (!channel || extra.length > 0) {
	die(`${channel ? `unexpected argument ${JSON.stringify(extra[0])}` : 'no channel given'}\n${usage}`)
}
for (const flag of flags) {
	if (!['--list', '--print-dir'].includes(flag)) {
		die(`unknown option ${flag}\n${usage}`)
	}
}

// stderr, so `--print-dir` output stays a bare path.
const log = (message) => console.error(`  ${message}`)

try {
	if (flags.includes('--list')) {
		const versions = listVersions(channel)
		if (versions.length === 0) {
			die(`no build has been published to the ${channel} channel yet`)
		}
		console.log(versions.join('\n'))
		process.exit(0)
	}

	const kit = await prepareKit(channel, version, log)
	log(`${kit.cached ? 'using' : 'ready:'} @cavell/kit ${kit.version} (${kit.channel} channel)`)

	if (flags.includes('--print-dir')) {
		console.log(kit.kitDir)
		process.exit(0)
	}

	const vite = spawn('yarn', ['vite', ...viteArgs], {
		cwd: appDir,
		stdio: 'inherit',
		env: { ...process.env, CAVELL_KIT_DIR: kit.kitDir },
	})
	vite.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
} catch (error) {
	if (error instanceof KitSourceError) {
		die(error.message)
	}

	throw error
}
