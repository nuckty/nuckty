import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sources = Object.fromEntries(['nuckty', 'nuckty-ext-block-grid'].map((name) => [name, { repository: `nuckty/${name}`, ref: '1'.repeat(40) }]));

function run(mode) {
    const directory = mkdtempSync(join(tmpdir(), 'nuckty-ci-sources-'));
    const output = join(directory, 'env');
    const bootstrap = `
        globalThis.fetch = async (url, { headers }) => {
            const parsed = new URL(url);
            if (parsed.searchParams.get('branch') !== 'main' || parsed.searchParams.get('event') !== 'push' || parsed.searchParams.get('status') !== 'success' || headers.Authorization !== 'Bearer fixture-token') {
                throw new Error('Invalid verified-source request');
            }
            const extension = parsed.pathname.includes('nuckty-ext-block-grid');
            return {
                ok: !(extension && process.env.MOCK_MODE === 'http'),
                status: 403,
                json: async () => ({ workflow_runs: extension && process.env.MOCK_MODE === 'missing' ? [] : [{ head_sha: extension && process.env.MOCK_MODE === 'invalid' ? 'main' : (extension ? 'b' : 'a').repeat(40) }] }),
            };
        };
        await import(${JSON.stringify(new URL('../.github/resolve-sources.mjs', import.meta.url).href)});
    `;
    try {
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', bootstrap], {
            encoding: 'utf8',
            env: { ...process.env, NUCKTY_SOURCES: JSON.stringify(sources), GH_TOKEN: 'fixture-token', GITHUB_ENV: output, MOCK_MODE: mode },
        });
        let env = '';
        try {
            env = readFileSync(output, 'utf8');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        return { ...result, env };
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test('CI resolves every package to a verified SHA, including extensions', () => {
    const result = run('success');
    assert.equal(result.status, 0, result.stderr);
    const variables = Object.fromEntries(result.env.trim().split('\n').map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    const resolved = JSON.parse(variables.NUCKTY_SOURCES);
    assert.equal(resolved.nuckty.ref, 'a'.repeat(40));
    assert.equal(resolved['nuckty-ext-block-grid'].ref, 'b'.repeat(40));
    assert.equal(variables.NUCKTY_DOCS_REF, 'a'.repeat(40));
    assert.equal(resolved['nuckty-ext-block-grid'].repository, sources['nuckty-ext-block-grid'].repository);
});

for (const mode of ['http', 'missing', 'invalid']) {
    test(`CI rejects ${mode} extension verification instead of using an old pin`, () => {
        const result = run(mode);
        assert.notEqual(result.status, 0);
        assert.ok(!result.env.includes('NUCKTY_SOURCES='));
    });
}
