import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);

for (const destination of ['project', 'input-parent', 'source', 'input-alias', 'unrelated']) {
    test(`coverage output rejects ${destination} before changing source or inputs`, async () => {
        const root = await realpath(await mkdtemp(path.join(tmpdir(), 'nuckty-coverage-output-')));
        const input = path.join(root, 'raw', 'input');
        const script = path.join(root, 'config/filter-coverage.mjs');
        const report = '{"result":[]}';
        let output = root;

        try {
            await mkdir(path.dirname(script));
            await mkdir(input, { recursive: true });
            await mkdir(path.join(root, 'src'));
            await cp(new URL('../../config/filter-coverage.mjs', import.meta.url), script);
            await writeFile(path.join(root, 'src/sentinel.ts'), 'KEEP');
            await writeFile(path.join(input, 'report.json'), report);

            if (destination === 'input-parent') {
                output = path.dirname(input);
            } else if (destination === 'source') {
                output = path.join(root, 'src');
            } else if (destination === 'input-alias') {
                output = path.join(root, 'alias');
                await symlink(input, output);
            } else if (destination === 'unrelated') {
                output = path.join(root, 'output');
                await mkdir(output);
                await writeFile(path.join(output, 'notes.txt'), 'KEEP');
            }
            await assert.rejects(execute(process.execPath, [await realpath(script), input, output]), /Coverage output/);
            assert.equal(await readFile(path.join(root, 'src/sentinel.ts'), 'utf8'), 'KEEP');
            assert.equal(await readFile(path.join(input, 'report.json'), 'utf8'), report);

            if (destination === 'unrelated') {
                assert.equal(await readFile(path.join(output, 'notes.txt'), 'utf8'), 'KEEP');
            }
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
}

test('coverage output replaces only a dedicated report directory and keeps native ranges', async () => {
    const root = await realpath(await mkdtemp(path.join(tmpdir(), 'nuckty-coverage-repeat-')));
    const input = path.join(root, 'raw');
    const output = path.join(root, 'reports');
    const script = path.join(root, 'config/filter-coverage.mjs');
    const native = { scriptId: '1', url: pathToFileURL(path.join(root, 'src/native.ts')).href, functions: [] };
    const external = { scriptId: '2', url: 'file:///external/vendor.js', functions: [] };

    try {
        await mkdir(path.dirname(script));
        await mkdir(input);
        await mkdir(output);
        await cp(new URL('../../config/filter-coverage.mjs', import.meta.url), script);
        await writeFile(path.join(output, 'old.json'), '{"result":[]}');
        await writeFile(path.join(input, 'new.json'), JSON.stringify({ result: [native, external] }));
        await execute(process.execPath, [await realpath(script), input, output]);
        assert.deepEqual(await readdir(output), ['new.json']);
        assert.deepEqual(JSON.parse(await readFile(path.join(output, 'new.json'), 'utf8')).result, [native]);
        await execute(process.execPath, [await realpath(script), input, output]);
        assert.deepEqual(await readdir(output), ['new.json']);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
