import { build } from 'esbuild';

/** Import source graphs the same way as the production TS/JS bundler. */
export async function bundle(source) {
    const result = await build({
        stdin: { contents: source, resolveDir: new URL('..', import.meta.url).pathname },
        bundle: true,
        write: false,
        platform: 'node',
        format: 'esm',
        plugins: [
            {
                name: 'external-packages',
                setup(build) {
                    build.onResolve({ filter: /^@/ }, ({ path }) => ({
                        path: import.meta.resolve(path),
                        external: true,
                    }));
                },
            },
        ],
    });

    return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64'));
}
