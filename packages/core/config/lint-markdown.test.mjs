import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./lint-markdown.mjs', import.meta.url));

test('Markdown EOF lint rejects invalid endings and fix preserves the content', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'nuckty-markdown-eof-'));
    const file = path.join(dir, 'fixture.md');
    const content = '# Heading\n\nParagraph with two spaces  ';

    try {
        for (const ending of ['', '\n\n', '\r\n', '\n \n\t\n']) {
            writeFileSync(file, content + ending);
            const lint = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });

            assert.equal(lint.status, 1);
            assert.ok(lint.stderr.includes(file));
            assert.equal(readFileSync(file, 'utf8'), content + ending);
            const fix = spawnSync(process.execPath, [script, '--fix', file], { encoding: 'utf8' });

            assert.equal(fix.status, 0, fix.stderr);
            assert.equal(fix.stdout + fix.stderr, '');
            assert.equal(readFileSync(file, 'utf8'), content + '\n');
            const valid = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });

            assert.equal(valid.status, 0, valid.stderr);
            assert.equal(valid.stdout + valid.stderr, '');
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('Markdown EOF lint skips tracked files deleted from the working tree', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'nuckty-markdown-eof-'));

    try {
        execFileSync('git', ['init', '--quiet'], { cwd: dir });
        writeFileSync(path.join(dir, 'kept.md'), '# Kept\n');
        writeFileSync(path.join(dir, 'removed.md'), '# Removed\n');
        execFileSync('git', ['add', '.'], { cwd: dir });
        unlinkSync(path.join(dir, 'removed.md'));
        const lint = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });

        assert.equal(lint.status, 0, lint.stderr);
        assert.equal(lint.stdout + lint.stderr, '');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
