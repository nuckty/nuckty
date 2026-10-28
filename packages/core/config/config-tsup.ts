import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        browser: 'src/browser.ts',
        'bin/nuckty': 'src/bin/nuckty.ts',
        // ESM loader (resolve + load hooks) registered by the CLI so `nuckty`
        // imports `.ts` extensions/config under plain Node without tsx. See
        // `src/bin/loader.ts` for why. esbuild must stay external — the loader
        // resolves it from the consumer's `node_modules/esbuild` at runtime.
        'bin/loader': 'src/bin/loader.ts',
    },
    format: ['esm'],
    target: 'node20',
    platform: 'node',
    outDir: 'dist',
    dts: false,
    sourcemap: true,
    clean: false, // tsc may have already written .d.ts into dist/
    shims: true,
    splitting: false,
    // Keep the engine out of the bin bundle: the bin imports `../index.js`
    // (and through it the whole engine) at runtime. Inlining it would duplicate
    // template state across two bundles. The shared scoped context keeps
    // declarations bound to the active build. Keeping `../index.js` external
    // also leaves the bin as a thin shim around one engine instance.
    external: ['../index.js', 'esbuild'],
});
