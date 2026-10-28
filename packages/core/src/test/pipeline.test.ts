/**
 * Tests for the programmatic Pipeline: phase ordering, stage registration,
 * before/after hooks, and that nothing is hard-wired (stages are added via API).
 *
 * @module test/pipeline
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pipeline, type BuildContext } from '../pipeline/pipeline.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';

function makeCtx(): BuildContext {
    return {
        cwd: '/fake',
        configDir: '/fake/config',
        buildDir: '/fake/.build',
        outDir: '/fake/site',
        target: 'default',
        env: new NucktyEnv(),
        templates: new Templates(),
        store: {},
        cache: new Map(),
    };
}

test('stages run in phase order, then declaration order', async () => {
    const calls: string[] = [];
    const p = new Pipeline();
    p.registerStage('a', () => { calls.push('a'); }, { phase: 'prepare' });
    p.registerStage('b', () => { calls.push('b'); }, { phase: 'render' });
    p.registerStage('c', () => { calls.push('c'); }, { phase: 'prepare' });
    p.registerStage('d', () => { calls.push('d'); }, { phase: 'clean' });
    await p.run(makeCtx());
    assert.deepEqual(calls, ['d', 'a', 'c', 'b']);
});

test('stageNames lists in run order', () => {
    const p = new Pipeline();
    p.registerStage('emit1', () => {}, { phase: 'emit' });
    p.registerStage('clean1', () => {}, { phase: 'clean' });
    p.registerStage('render1', () => {}, { phase: 'render' });
    assert.deepEqual(p.stageNames(), ['clean1', 'render1', 'emit1']);
});

test('before hook runs before stage', async () => {
    const calls: string[] = [];
    const p = new Pipeline();
    p.registerStage('render', () => { calls.push('render'); }, { phase: 'render' });
    p.before('render', () => { calls.push('before-render'); });
    await p.run(makeCtx());
    assert.deepEqual(calls, ['before-render', 'render']);
});

test('after hook runs after stage', async () => {
    const calls: string[] = [];
    const p = new Pipeline();
    p.registerStage('render', () => { calls.push('render'); }, { phase: 'render' });
    p.after('render', () => { calls.push('after-render'); });
    await p.run(makeCtx());
    assert.deepEqual(calls, ['render', 'after-render']);
});

test('unknown hooks reject before the clean phase', async () => {
    const calls: string[] = [];
    const p = new Pipeline();
    p.before('nope', () => { calls.push('before'); });
    p.after('nope', () => { calls.push('after'); });
    p.registerStage('real', () => { calls.push('real'); }, { phase: 'clean' });
    await assert.rejects(p.run(makeCtx()), /unknown pipeline stage "nope"/);
    assert.deepEqual(calls, []);
});

test('stages share context via store', async () => {
    const p = new Pipeline();
    p.registerStage('set', (ctx) => { ctx.store.value = 42; }, { phase: 'prepare' });
    let seen: unknown;
    p.registerStage('get', (ctx) => { seen = ctx.store.value; }, { phase: 'render' });
    await p.run(makeCtx());
    assert.equal(seen, 42);
});

test('async stages are awaited', async () => {
    const calls: string[] = [];
    const p = new Pipeline();
    p.registerStage('slow', async () => {
        await new Promise((r) => setTimeout(r, 5));
        calls.push('slow');
    }, { phase: 'render' });
    p.registerStage('after-slow', () => { calls.push('after-slow'); }, { phase: 'render' });
    await p.run(makeCtx());
    assert.deepEqual(calls, ['slow', 'after-slow']);
});

test('empty pipeline runs cleanly', async () => {
    const p = new Pipeline();
    await p.run(makeCtx());
    assert.deepEqual(p.stageNames(), []);
});

test('finalizers retain hooks and run only after all emit stages', async () => {
    const pipeline = new Pipeline();
    const calls: string[] = [];
    pipeline.registerFinalizer('htaccess', () => { calls.push('htaccess'); });
    pipeline.registerFinalizer('manifest', () => { calls.push('manifest'); });
    pipeline.after('htaccess', () => { calls.push('redirects'); });
    pipeline.registerStage('extension', () => { calls.push('emit'); }, { phase: 'emit' });
    await pipeline.run(makeCtx());
    assert.deepEqual(calls, ['emit']);
    await pipeline.finalize(makeCtx());
    assert.deepEqual(calls, ['emit', 'htaccess', 'redirects', 'manifest']);
    assert.throws(() => pipeline.registerStage('manifest', () => {}, { phase: 'emit' }), /already registered/);
});
