/**
 * Tests for the validate-vnu concurrency helpers (openspec
 * `ext-command-validate-vnu`): `runAll` runs task factories under a concurrency
 * limit and preserves input order in the output; `serial` runs them one-by-one.
 * The tests measure actual in-flight tasks and verify input-order results.
 * Fatal rejection must drain running work and stop scheduling queued tasks.
 * `findHtmlFiles` collects the pages to validate.
 *
 * @module test/runAll
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { findHtmlFiles, runAll, serial } from '../index.js';

/** Delay helper that resolves after `ms` with `value`. */
function delay<T>(value: T, ms: number): Promise<T> {
    return new Promise((r) => setTimeout(() => r(value), ms));
}

// ---- runAll (concurrency-limited, order-preserving) ------------------------

test('runAll: results come back in input order, not completion order', async () => {
    // Task 0 is slowest; task 2 is fastest. Output must still be [a, b, c].
    const tasks = [
        () => delay('a', 30),
        () => delay('b', 10),
        () => delay('c', 5),
    ];
    const result = await runAll(tasks, 3);
    assert.deepEqual(result, ['a', 'b', 'c']);
});

test('runAll: limit bounds the number of simultaneously in-flight tasks', async () => {
    // With limit=2 and 5 tasks, at most 2 run at once. Track the high-water mark.
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 5 }, (_, i) => () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return delay(i, 10).then((v) => {
            inFlight--;
            return v;
        });
    });
    const result = await runAll(tasks, 2);
    assert.deepEqual(result, [0, 1, 2, 3, 4]);
    assert.ok(maxInFlight <= 2, `maxInFlight ${maxInFlight} exceeded limit 2`);
    assert.ok(maxInFlight >= 1, 'no task ever ran');
});

test('runAll: limit larger than task count runs all at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 3 }, (_, i) => () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return delay(i, 10).then((v) => { inFlight--; return v; });
    });
    const result = await runAll(tasks, 8);
    assert.deepEqual(result, [0, 1, 2]);
    assert.equal(maxInFlight, 3);
});

test('runAll: an empty task list returns an empty array', async () => {
    assert.deepEqual(await runAll([], 8), []);
});

test('runAll: limit 0 falls back to one worker and preserves every result', async () => {
    const tasks = [() => delay('a', 1), () => delay('b', 1)];
    assert.deepEqual(await runAll(tasks, 0), ['a', 'b']);
});

test('runAll: fatal rejection drains in-flight work and schedules no new tasks', async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const events: string[] = [];
    const running = runAll([
        async () => { throw new Error('fatal'); },
        async () => { await gate; events.push('settled'); },
        async () => { events.push('unexpected'); },
    ], 2);
    let completed = false;
    const checked = assert.rejects(running, /fatal/).then(() => { completed = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(completed, false);
    finish();
    await checked;
    assert.deepEqual(events, ['settled']);
});

// ---- serial (one-by-one) ----------------------------------------------------

test('serial: runs tasks in order and returns results in order', async () => {
    const order: number[] = [];
    const tasks = [0, 1, 2].map((i) => () => delay(i, 5).then((v) => { order.push(i); return v; }));
    const result = await serial(tasks);
    assert.deepEqual(result, [0, 1, 2]);
    assert.deepEqual(order, [0, 1, 2]);
});

test('serial: runs strictly one at a time (no overlap)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 4 }, (_, i) => () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return delay(i, 5).then((v) => { inFlight--; return v; });
    });
    await serial(tasks);
    assert.equal(maxInFlight, 1, 'serial must never run more than one task');
});

test('serial: an empty task list returns an empty array', async () => {
    assert.deepEqual(await serial([]), []);
});

// ---- findHtmlFiles ------------------------------------------------------------

test('findHtmlFiles: collects nested html files, skips non-html', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-vnu-target-'));
    try {
        await mkdir(path.join(dir, 'html', 'sub'), { recursive: true });
        await writeFile(path.join(dir, 'html', 'a.html'), '<p>a</p>');
        await writeFile(path.join(dir, 'html', 'sub', 'b.html'), '<p>b</p>');
        await writeFile(path.join(dir, 'html', 'c.css'), 'x');
        const files = await findHtmlFiles(path.join(dir, 'html'), []);
        assert.deepEqual(files.sort(), [
            path.join(dir, 'html', 'a.html'),
            path.join(dir, 'html', 'sub', 'b.html'),
        ]);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
