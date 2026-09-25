import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { loadEnv } from 'vite';

// Inline Firebase web config at build time so the packaged app doesn't
// depend on a runtime .env file (which is not shipped in the asar).
const env = loadEnv('development', __dirname, '');

const FIREBASE_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
] as const;

// Fail the build rather than shipping an app that installs fine and then
// can't log in. These values are baked in, so a missing key is unrecoverable
// at runtime and surfaces only as an opaque Firebase auth error.
const missingFirebaseKeys = FIREBASE_KEYS.filter((key) => !env[key]?.trim());
if (missingFirebaseKeys.length > 0) {
  throw new Error(
    `Firebase config incomplete — cannot build.\n` +
      `Missing or empty in .env: ${missingFirebaseKeys.join(', ')}\n` +
      `Add the value(s) to .env and rebuild.`,
  );
}

const firebaseDefine = Object.fromEntries(
  FIREBASE_KEYS.map((key) => [`process.env.${key}`, JSON.stringify(env[key])]),
);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: firebaseDefine,
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
  },
});
