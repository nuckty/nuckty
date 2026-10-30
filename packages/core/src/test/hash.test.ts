import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { generateHash, generateFileHash } from '../utils/hash.js';

async function makeProject(): Promise<string> {
    return mkdtemp(path.join(tmpdir(), 'nuckty-hash-'));
}

test('generateHash: deterministic, 16 hex chars', () => {
    assert.equal(generateHash('abc'), generateHash('abc'));
    assert.match(generateHash('abc'), /^[a-f0-9]{16}$/);
});

test('generateHash: a string and its UTF-8 buffer hash alike', () => {
    assert.equal(generateHash('hello'), generateHash(Buffer.from('hello')));
});

test('file hashing includes every stream chunk and reports absent input', async () => {
    const dir = await makeProject();
    const file = path.join(dir, 'large.mp4');
    const bytes = Buffer.alloc(1024 * 1024, 65);

    try {
        await writeFile(file, bytes);
        assert.equal(await generateFileHash(file), generateHash(bytes));
        await assert.rejects(generateFileHash(path.join(dir, 'absent.mp4')), { code: 'ENOENT' });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
