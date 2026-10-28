/** Guard the measurement itself: minified TS loaders can falsely cover every line. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { selectCoverageScripts } from '../../config/filter-coverage.mjs';

test('coverage marks the body of an uncalled TypeScript function uncovered', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-coverage-loader-'));
    const fixture = path.join(root, 'src', 'fixture.ts');
    const require = createRequire(import.meta.url);
    const loader = fileURLToPath(new URL('../../config/register-test-source.mjs', import.meta.url));
    const env = { ...process.env, NODE_V8_COVERAGE: path.join(root, 'raw') };

    try {
        await mkdir(path.dirname(fixture));
        await writeFile(fixture, `export function called(value: string): string {
    return value;
}
export function uncalled(value: string): string {
    const upper = value.toUpperCase();
    return upper + 'never';
}
`);
        execFileSync(process.execPath, ['--import', loader, '--input-type=module', '-e', `import { called } from ${JSON.stringify(pathToFileURL(fixture).href)}; called('fixture');`], { env, stdio: 'pipe' });
        // Mix in a real compacted duplicate: the production pipeline must discard it.
        execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `import { called } from ${JSON.stringify(pathToFileURL(fixture).href)}; called('fixture');`], { env, stdio: 'pipe' });
        const filtered = path.join(root, 'filtered');

        await mkdir(filtered);
        for (const name of await readdir(env.NODE_V8_COVERAGE)) {
            const raw = JSON.parse(await readFile(path.join(env.NODE_V8_COVERAGE, name), 'utf8'));

            await writeFile(path.join(filtered, name), JSON.stringify(selectCoverageScripts(raw, await realpath(root))));
        }
        const reportEnv = { ...process.env };

        delete reportEnv.NODE_V8_COVERAGE;
        execFileSync(process.execPath, [require.resolve('c8/bin/c8.js'), 'report', '--allowExternal', '--temp-directory', filtered, '--include', '**/fixture.ts', '--exclude', '**/node_modules/**', '--reporter', 'json-summary', '--reports-dir', path.join(root, 'report')], { env: reportEnv, stdio: 'pipe' });
        const report = JSON.parse(await readFile(path.join(root, 'report/coverage-summary.json'), 'utf8')) as Record<string, { lines: { pct: number }; functions: { covered: number; total: number } }>;
        const coverage = report[await realpath(fixture)];

        assert.ok(coverage, 'fixture must be present in the source report');
        assert.ok(coverage.lines.pct < 100, 'uncalled body must not count as covered');
        assert.equal(coverage.functions.covered, 1);
        assert.equal(coverage.functions.total, 2);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
