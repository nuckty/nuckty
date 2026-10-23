import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, symlinkSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sourceCopyFilter } from './copy-filter.mjs';

test('every sibling snapshot excludes private configs and external symlink contents', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'nuckty-copy-boundary-'));

    try {
        for (const name of ['core', 'extension', 'demo']) {
            const source = path.join(root, name);
            const output = path.join(root, `${name}-copy`);

            mkdirSync(path.join(source, 'config'), { recursive: true });
            writeFileSync(path.join(source, 'config', 'auth-ftp.json'), 'SYNTHETIC-PRIVATE');
            writeFileSync(path.join(source, '.env.local'), 'SYNTHETIC-PRIVATE');
            for (const directory of ['site', 'site-en', '.cache', '.preview']) {
                mkdirSync(path.join(source, directory));
                writeFileSync(path.join(source, directory, 'generated.txt'), 'GENERATED');
            }
            writeFileSync(path.join(source, 'config', 'site.json'), '{}');
            writeFileSync(path.join(root, 'outside.txt'), 'SYNTHETIC-PRIVATE');
            symlinkSync(path.join(root, 'outside.txt'), path.join(source, 'linked.txt'));
            cpSync(source, output, { recursive: true, filter: sourceCopyFilter(source) });
            assert.deepEqual(readdirSync(path.join(output, 'config')), ['site.json']);
            assert.deepEqual(readdirSync(output), ['config']);
            assert.equal(readFileSync(path.join(output, 'config', 'site.json'), 'utf8'), '{}');
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
