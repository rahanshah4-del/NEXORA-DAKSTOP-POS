/**
 * verify-win-native.mjs — build gate for the packaged Windows native binary.
 *
 * The failure this exists to catch: better-sqlite3's .node is rebuilt for the
 * host on every `npm install` (postinstall → install-app-deps), and
 * `npmRebuild: false` tells electron-builder not to touch it. So a `--win`
 * build on a Mac will happily copy a Mach-O .node into app.asar.unpacked. The
 * installer works, and the app then exits silently on launch with no window.
 *
 * Parses the PE header in plain Node — no `file`, no external tooling — so the
 * gate behaves identically on a Mac and on a Windows CI runner.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ASAR = join(ROOT, 'dist/win-unpacked/resources/app.asar');
const NATIVE = join(
  ROOT,
  'dist/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
);

const IMAGE_FILE_MACHINE = {
  0x8664: 'x64 (AMD64)',
  0x014c: 'x86 (i386)',
  0xaa64: 'arm64',
  0x01c4: 'armv7',
};

/**
 * Assert that `filePath` is a 64-bit Windows PE image.
 * Returns { machine, bytes, peOffset }. Throws with a diagnostic message.
 */
export function assertPeX64(filePath, label = filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} is missing.\n  expected: ${filePath}`);
  }

  const buf = readFileSync(filePath);

  // ── DOS header: "MZ" ──
  if (buf.length < 64 || buf[0] !== 0x4d || buf[1] !== 0x5a) {
    const head = buf.subarray(0, 4).toString('hex');
    const machO = ['cffaedfe', 'cefaedfe', 'feedfacf', 'feedface'].includes(head);
    const fat = head.startsWith('cafeba');
    const hint = machO
      ? '\n  This is a Mach-O (macOS) binary — the host build was shipped instead of the Windows prebuild.'
      : fat
        ? '\n  This is a Mach-O universal (fat) binary — macOS, not Windows.'
        : buf.subarray(0, 4).toString('hex') === '7f454c46'
          ? '\n  This is an ELF (Linux) binary.'
          : '';
    throw new Error(
      `${label} is not a Windows binary: missing "MZ" DOS signature (first 4 bytes: ${head}).${hint}`,
    );
  }

  // ── PE signature at e_lfanew (uint32 LE @ 0x3C) ──
  const peOffset = buf.readUInt32LE(0x3c);
  if (peOffset + 6 > buf.length) {
    throw new Error(
      `${label} has a corrupt PE header: e_lfanew=0x${peOffset.toString(16)} is past end of file (${buf.length} bytes).`,
    );
  }

  const sig = buf.subarray(peOffset, peOffset + 4);
  if (!(sig[0] === 0x50 && sig[1] === 0x45 && sig[2] === 0x00 && sig[3] === 0x00)) {
    throw new Error(
      `${label} has a bad PE signature at 0x${peOffset.toString(16)}: ` +
        `expected "PE\\0\\0", got ${sig.toString('hex')}.`,
    );
  }

  // ── COFF Machine field (uint16 LE, first field after the signature) ──
  const machine = buf.readUInt16LE(peOffset + 4);
  if (machine !== 0x8664) {
    const got = IMAGE_FILE_MACHINE[machine] ?? `unknown (0x${machine.toString(16)})`;
    throw new Error(
      `${label} is the wrong architecture: COFF Machine is ${got}, expected x64 (0x8664).`,
    );
  }

  return { machine: IMAGE_FILE_MACHINE[machine], bytes: buf.length, peOffset };
}

/** Throws with an actionable message if the packaged Windows output is wrong. */
export function verifyWinNative() {
  if (!existsSync(ASAR)) {
    throw new Error(
      `Packaged app.asar is missing.\n  expected: ${ASAR}\n` +
        `electron-builder did not produce a win-unpacked tree — check the packaging step above.`,
    );
  }

  const pe = assertPeX64(NATIVE, 'app.asar.unpacked better_sqlite3.node');

  return {
    nativePath: NATIVE,
    asarPath: ASAR,
    asarBytes: statSync(ASAR).size,
    ...pe,
  };
}

// ── CLI entry: `node scripts/verify-win-native.mjs` ──
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const r = verifyWinNative();
    console.log(`✓ app.asar present (${(r.asarBytes / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`✓ better_sqlite3.node is PE32+ ${r.machine}, ${r.bytes} bytes`);
  } catch (err) {
    console.error(`\n✗ Windows native verification FAILED\n\n${err.message}\n`);
    process.exit(1);
  }
}
