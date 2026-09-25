/**
 * package-win.mjs — build a Windows x64 installer, from this Mac or from CI.
 *
 * Why an orchestrator instead of a one-line npm script:
 *
 *   better-sqlite3 is the only native production dependency, and the copy in
 *   node_modules is built for whatever host last ran `npm install`
 *   (postinstall → electron-builder install-app-deps). electron-builder is told
 *   `npmRebuild: false` so it will not re-build during a cross-platform
 *   `--win` run — which means, left alone, it packages the *macOS* .node.
 *   The installer then works and the app exits silently on launch.
 *
 * So the order matters, and every step has to be enforced:
 *
 *   1. build      electron-vite → out/{main,preload,renderer}
 *   2. stage      fetch the win32-x64 better-sqlite3 prebuild for this exact
 *                 Electron ABI, overwriting the host binary  (+ verify it)
 *   3. package    electron-builder --win --x64
 *   4. gate       re-verify the binary that actually landed in app.asar.unpacked
 *   5. restore    ALWAYS put the host binary back, so `npm run dev` still works
 *
 * Step 5 runs in a finally block. Without it, a Windows build leaves this Mac
 * unable to start the app until someone figures out why.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPeX64, verifyWinNative } from './verify-win-native.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BSQ_DIR = join(ROOT, 'node_modules/better-sqlite3');
const BSQ_NATIVE = join(BSQ_DIR, 'build/Release/better_sqlite3.node');
const PREBUILD_INSTALL = join(ROOT, 'node_modules/prebuild-install/bin.js');

const TARGET_PLATFORM = 'win32';
const TARGET_ARCH = 'x64';

let step = 0;
const banner = (msg) => console.log(`\n\x1b[1m[${++step}/5] ${msg}\x1b[0m`);
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);

class StepError extends Error {}

/**
 * process.env minus the npm_config_* keys that would override the explicit
 * --target/--arch/--platform flags passed to prebuild-install (npm sets these
 * when it invokes a script).
 */
function cleanNpmEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^npm_config_(target|runtime|arch|platform|build_from_source|target_arch)$/i.test(k)) {
      delete env[k];
    }
  }
  return env;
}

/** Run a command, inheriting stdio. Throws StepError on non-zero exit. */
function run(cmd, args, opts = {}) {
  const printable = `${cmd} ${args.join(' ')}`;
  console.log(`  $ ${printable}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  if (res.error) throw new StepError(`Failed to launch: ${printable}\n  ${res.error.message}`);
  if (res.signal) throw new StepError(`Killed by signal ${res.signal}: ${printable}`);
  if (res.status !== 0) throw new StepError(`Exited ${res.status}: ${printable}`);
}

/**
 * The Electron version to build the native module against. Read from
 * package.json so --target can never drift from the installed Electron, and
 * required to be exact — a caret range would make the ABI non-deterministic.
 */
function resolveElectronTarget() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  const declared = pkg.devDependencies?.electron;
  if (!declared) throw new StepError('electron is not in devDependencies.');
  if (!/^\d+\.\d+\.\d+$/.test(declared)) {
    throw new StepError(
      `electron must be pinned to an exact version in package.json, found "${declared}".\n` +
        `  A range makes the native ABI non-deterministic — the prebuild is fetched for\n` +
        `  one ABI while a different Electron may be installed.`,
    );
  }

  const installedPkg = join(ROOT, 'node_modules/electron/package.json');
  if (existsSync(installedPkg)) {
    const installed = JSON.parse(readFileSync(installedPkg, 'utf-8')).version;
    if (installed !== declared) {
      throw new StepError(
        `electron version mismatch: package.json pins ${declared} but node_modules has ${installed}.\n` +
          `  Run \`npm install\` so the prebuild ABI matches the Electron that ships.`,
      );
    }
  }

  return declared;
}

/** Object-format of the staged .node, by magic bytes. */
function nativeKind() {
  if (!existsSync(BSQ_NATIVE)) return null;
  const head = readFileSync(BSQ_NATIVE).subarray(0, 4).toString('hex');
  if (head.startsWith('4d5a')) return { id: 'pe', label: 'PE (Windows)' };
  if (['cffaedfe', 'cefaedfe', 'feedfacf', 'feedface'].includes(head))
    return { id: 'macho', label: 'Mach-O (macOS)' };
  if (head.startsWith('cafeba')) return { id: 'macho', label: 'Mach-O universal (macOS)' };
  if (head === '7f454c46') return { id: 'elf', label: 'ELF (Linux)' };
  return { id: 'unknown', label: `unknown (${head})` };
}

/** Object-format this host needs in order to run `npm run dev`. */
const HOST_KIND = { darwin: 'macho', win32: 'pe', linux: 'elf' }[process.platform] ?? 'unknown';

function describeNative(label) {
  const kind = nativeKind();
  if (!kind) return `${label}: (absent)`;
  return `${label}: ${kind.label}, ${statSync(BSQ_NATIVE).size} bytes`;
}

/**
 * Put a host-native better_sqlite3.node back, so `npm run dev` keeps working.
 *
 * `electron-builder install-app-deps` alone is NOT enough. @electron/rebuild
 * leaves a `.forge-meta` marker (e.g. "x64--130") next to the binary and skips
 * the rebuild when it matches the current arch/ABI — which it still does after
 * prebuild-install swapped in the win32 .node. The result is a silent no-op:
 * install-app-deps logs "finished" and the Windows binary stays put.
 *
 * So: clear the build dir first (marker included), then fetch the host prebuild
 * the same way step 2 fetches the Windows one, falling back to install-app-deps
 * if no prebuild is available. Finally *verify*, because a restore that quietly
 * did nothing is the whole problem being fixed here.
 */
function restoreHostNative() {
  rmSync(join(BSQ_DIR, 'build'), { recursive: true, force: true });

  let restored = false;
  if (existsSync(PREBUILD_INSTALL)) {
    try {
      run(
        process.execPath,
        [
          PREBUILD_INSTALL,
          '--runtime=electron',
          `--target=${resolveElectronTarget()}`,
          `--platform=${process.platform}`,
          `--arch=${process.arch}`,
          '--force',
        ],
        { cwd: BSQ_DIR, env: cleanNpmEnv() },
      );
      restored = true;
    } catch {
      console.log('  prebuild unavailable for this host — falling back to a local rebuild');
    }
  }

  if (!restored) run('npx', ['electron-builder', 'install-app-deps']);

  const kind = nativeKind();
  if (!kind) throw new Error(`Restore produced no binary at ${BSQ_NATIVE}`);
  if (kind.id !== HOST_KIND) {
    throw new Error(
      `Restore left a ${kind.label} binary, but this host (${process.platform}-${process.arch}) needs ${HOST_KIND}.`,
    );
  }
}

/** Newest .exe in dist/, for the closing report. */
function findInstaller() {
  const dist = join(ROOT, 'dist');
  if (!existsSync(dist)) return null;
  const exes = readdirSync(dist)
    .filter((f) => f.toLowerCase().endsWith('.exe'))
    .map((f) => ({ path: join(dist, f), name: f, stat: statSync(join(dist, f)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return exes[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const electronTarget = resolveElectronTarget();

  console.log(
    `\n\x1b[1mNexora POS — Windows installer\x1b[0m\n` +
      `  host      : ${process.platform}-${process.arch}\n` +
      `  target    : ${TARGET_PLATFORM}-${TARGET_ARCH}\n` +
      `  electron  : ${electronTarget}\n` +
      `  ${describeNative('native in')}`,
  );

  // ── 1. Renderer / main / preload bundles ──
  banner('Building bundles (electron-vite)');
  run('npm', ['run', 'build']);
  for (const f of ['out/main/index.js', 'out/preload/index.js', 'out/renderer/index.html']) {
    if (!existsSync(join(ROOT, f))) throw new StepError(`Build did not produce ${f}`);
  }
  ok('out/main, out/preload, out/renderer present');

  // ── 2. Stage the Windows native binary ──
  banner(`Fetching better-sqlite3 prebuild (electron ${electronTarget} ${TARGET_PLATFORM}-${TARGET_ARCH})`);
  if (!existsSync(PREBUILD_INSTALL)) {
    throw new StepError(
      `prebuild-install not found at ${PREBUILD_INSTALL}\n` +
        `  It is a dependency of better-sqlite3 — run \`npm install\`.`,
    );
  }

  // prebuild-install resolves ./package.json from cwd, so it must run inside
  // the module dir, with npm's own config stripped from the environment.
  run(
    process.execPath,
    [
      PREBUILD_INSTALL,
      '--runtime=electron',
      `--target=${electronTarget}`,
      `--platform=${TARGET_PLATFORM}`,
      `--arch=${TARGET_ARCH}`,
      '--force',
      '--verbose',
    ],
    { cwd: BSQ_DIR, env: cleanNpmEnv() },
  );

  // Fail here rather than after a multi-minute package step.
  const staged = assertPeX64(BSQ_NATIVE, 'staged better_sqlite3.node');
  ok(`staged binary is PE32+ ${staged.machine}, ${staged.bytes} bytes`);

  // ── 3. Package ──
  banner('Packaging (electron-builder --win --x64)');
  run('npx', ['electron-builder', '--win', '--x64']);
  ok('electron-builder finished');

  // ── 4. Gate ──
  banner('Verifying packaged native binary');
  const v = verifyWinNative();
  ok(`app.asar present (${(v.asarBytes / 1024 / 1024).toFixed(1)} MB)`);
  ok(`app.asar.unpacked better_sqlite3.node is PE32+ ${v.machine}, ${v.bytes} bytes`);

  const installer = findInstaller();
  if (!installer) throw new StepError('No .exe found in dist/ after packaging.');
  return { installer, electronTarget };
}

let exitCode = 0;
let result = null;
let failure = null;

try {
  result = await main();
} catch (err) {
  exitCode = 1;
  failure = err;
} finally {
  // ── 5. Restore the host binary — unconditionally ──
  // Fixed label, not banner(): this runs even when an earlier step failed.
  console.log(`\n\x1b[1m[5/5] Restoring host native binary for local dev\x1b[0m`);
  try {
    restoreHostNative();
    ok(describeNative('native in'));
  } catch (restoreErr) {
    // Don't mask the real failure, but make this impossible to miss.
    console.error(
      `\n\x1b[33m⚠ Could not restore the host native binary.\x1b[0m\n` +
        `  ${restoreErr.message}\n` +
        `  \`npm run dev\` will fail until better-sqlite3 is rebuilt for ${process.platform}-${process.arch}:\n` +
        `      rm -rf node_modules/better-sqlite3/build && npx electron-builder install-app-deps\n`,
    );
    exitCode = 1;
  }
}

if (failure) {
  console.error(`\n\x1b[31m✗ Windows packaging FAILED\x1b[0m\n\n${failure.message}\n`);
} else if (result) {
  const mb = (result.installer.stat.size / 1024 / 1024).toFixed(1);
  console.log(
    `\n\x1b[32m✓ Windows installer built and verified\x1b[0m\n` +
      `  ${result.installer.path}\n` +
      `  ${mb} MB · electron ${result.electronTarget} · win32-x64 · unsigned\n`,
  );
}

process.exit(exitCode);
