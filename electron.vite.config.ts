import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { loadEnv } from 'vite';

// Inline Firebase web config at build time so the packaged app doesn't
// depend on a runtime .env file (which is not shipped in the asar).
const env = loadEnv('development', __dirname, '');

const firebaseDefine = {
  'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY ?? ''),
  'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN ?? ''),
  'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID ?? ''),
  'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET ?? ''),
  'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID ?? ''),
  'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID ?? ''),
};

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
