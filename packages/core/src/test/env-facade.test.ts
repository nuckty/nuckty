/**
 * Tests for the `env.markdown` and `env.pipeline` facades (openspec `extensions`
 * spec): the markdown-extension entry point (`use`/`directive`/`directiveHandler`
 * /`directiveMappings`/`directiveNames`) and the pipeline-extension buffer
 * (`before`/`after`/`registerStage` buffered, then `flush`ed onto a real
 * Pipeline). These are non-trivial: the markdown facade maps generic directives
 * to handlers (the core knows no construct), and the pipeline facade decouples
 * `register(env)` time (before the Pipeline exists) from build time (`flush`).
 *
 * @module test/env-facade
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MarkdownFacade, PipelineFacade, NucktyEnv } from '../env/env.js';
import { DocumentFacade } from '../document/document.js';
import type { DocumentData } from '../document/document.js';
import type { DirectiveConverters, DirectiveNode, DirectiveHandler } from '../env/env.js';
import { Pipeline } from '../pipeline/pipeline.js';
import type { BuildContext } from '../pipeline/pipeline.js';
import { Templates } from '../bem/templates.js';

const convert: DirectiveConverters = { inline: () => [], blocks: () => [] };

/** A remark plugin stand-in — `use` stores it verbatim. */
const pluginA = (() => {}) as unknown as Parameters<MarkdownFacade['use']>[0];
const pluginB = (() => {}) as unknown as Parameters<MarkdownFacade['use']>[0];

const documentData: DocumentData = {
    page: {
        file: 'index.md',
        url: '/',
        name: 'Home',
        title: 'Home',
        section: null,
        breadcrumbs: [],
    },
    content: 'Content',
    sitemap: { sitemap: [], pages: {}, md2url: {}, md2urls: {}, url2md: {} },
    assets: { css: {}, js: {}, images: {}, videos: {} },
    alternates: new Map(),
};

test('DocumentFacade passes data to a consumer handler without dictating its block', async () => {
    const facade = new DocumentFacade();

    facade.register((data) => ({ block: 'consumer-document', content: data.content }));

    assert.deepEqual(await facade.render(documentData), {
        block: 'consumer-document',
        content: 'Content',
    });
});

test('DocumentFacade fails clearly when the consumer did not register a handler', async () => {
    const facade = new DocumentFacade();

    await assert.rejects(() => facade.render(documentData), /no document handler registered/);
});

test('DocumentFacade rejects ambiguous duplicate handlers', () => {
    const facade = new DocumentFacade();

    facade.register(() => 'first');

    assert.throws(() => facade.register(() => 'second'), /already registered/);
});

test('MarkdownFacade.use stores plugins and list() returns them in order', () => {
    const md = new MarkdownFacade();
    assert.deepEqual(md.list(), []);
    md.use(pluginA);
    md.use(pluginB);
    assert.equal(md.list().length, 2);
    assert.equal(md.list()[0], pluginA);
    assert.equal(md.list()[1], pluginB);
    // list() returns a snapshot — mutating it does not change the facade.
    const snap = md.list();
    snap.length = 0;
    assert.equal(md.list().length, 2);
});

test('MarkdownFacade.directive maps a name to a handler and lookups resolve', () => {
    const md = new MarkdownFacade();
    const handler: DirectiveHandler = () => ({ block: 'gallery' });
    md.directive('gallery', handler);
    assert.equal(md.directiveMappings().get('gallery'), handler);
    assert.equal(md.directiveMappings().get('unknown'), undefined);
    assert.deepEqual([...md.directiveMappings().keys()], ['gallery']);
});

test('MarkdownFacade.directiveMappings returns a snapshot map the bridge copies', () => {
    // The sitemap stage hands `directiveMappings()` to the remark processor; the
    // bridge looks handlers up by name. The snapshot must be independent of
    // later registrations (no aliasing of the internal map).
    const md = new MarkdownFacade();
    const h1: DirectiveHandler = () => ({ block: 'gallery' });
    md.directive('gallery', h1);
    const snap = md.directiveMappings();
    assert.equal(snap.get('gallery'), h1);
    assert.equal(snap.size, 1);
    // Register after the snapshot — the snapshot MUST NOT see it.
    const h2: DirectiveHandler = () => ({ block: 'grid' });
    md.directive('grid', h2);
    assert.equal(snap.size, 1);
    assert.equal(snap.get('grid'), undefined);
    // A fresh snapshot does see the new directive.
    assert.equal(md.directiveMappings().size, 2);
});

test('directive handler returning null signals "fall back to plain content"', () => {
    // openspec `markdown` spec: a handler returns null → the core emits the
    // directive's plain content (no break). The facade just stores the handler;
    // the contract is that null is a sentinel the bridge checks.
    const md = new MarkdownFacade();
    const fallthrough: DirectiveHandler = () => null;
    md.directive('callout', fallthrough);
    const node: DirectiveNode = { name: 'callout', children: [] };
    assert.equal(md.directiveMappings().get('callout')!(node, {}, convert), null);
});

test('directive handler receives the structural node and an opaque env', () => {
    // The handler's `node` carries name/children/attributes; `env` is the bridge
    // environment (image mapping, page input path, …) — opaque to the core.
    const md = new MarkdownFacade();
    let received: DirectiveNode | undefined;
    let receivedEnv: unknown;
    md.directive('grid', (node, env) => {
        received = node;
        receivedEnv = env;
        return { block: 'grid', content: [] };
    });
    const node: DirectiveNode = { name: 'grid', children: [{ type: 'paragraph' }], attributes: { id: 'a' } };
    const bridgeEnv = { imageMapping: {} };
    md.directiveMappings().get('grid')!(node, bridgeEnv, convert);
    assert.equal(received, node);
    assert.equal(receivedEnv, bridgeEnv);
    assert.equal(received?.attributes?.id, 'a');
});

test('PipelineFacade buffers before/after/registerStage and flush replays them in order', async () => {
    // Extensions call env.pipeline.before/after at register time, before the
    // real Pipeline exists. The facade buffers the calls; buildOne flushes them
    // onto a live Pipeline. Declaration order is preserved within each kind.
    const calls: string[] = [];
    const facade = new PipelineFacade();
    facade.after('htaccess', () => { calls.push('after-htaccess'); });
    facade.before('render', () => { calls.push('before-render'); });
    facade.registerStage('render', () => { calls.push('render'); }, { phase: 'render' });

    const pipeline = new Pipeline();
    pipeline.registerFinalizer('htaccess', () => { calls.push('htaccess'); });
    facade.flush(pipeline);

    const context: BuildContext = {
        cwd: '/fake', configDir: '/fake/config', buildDir: '/fake/.build', outDir: '/fake/site',
        target: 't', env: new NucktyEnv(), templates: new Templates(), store: {}, cache: new Map(),
    };
    await pipeline.run(context);
    assert.deepEqual(calls, ['before-render', 'render']);
    await pipeline.finalize(context);
    assert.deepEqual(calls, ['before-render', 'render', 'htaccess', 'after-htaccess']);
});

test('PipelineFacade flush replays the buffered registrations (called once per build)', async () => {
    // The facade does not clear its buffer — `buildOne` flushes exactly once per
    // build, so the buffer is never replayed in practice. Re-flushing would
    // double-register; this test pins that contract (one flush per pipeline).
    const calls: string[] = [];
    const facade = new PipelineFacade();
    facade.registerStage('s', () => { calls.push('s'); }, { phase: 'render' });
    const pipeline = new Pipeline();
    facade.flush(pipeline);
    await pipeline.run({
        cwd: '/fake', buildDir: '/fake/.build', outDir: '/fake/site',
        target: 't', env: new NucktyEnv(), store: {}, cache: new Map(),
    } as BuildContext);
    assert.deepEqual(calls, ['s']);
});

test('independent environments keep extension registrations and behavior isolated', async () => {
    const first = new NucktyEnv();
    const second = new NucktyEnv();
    const calls: string[] = [];

    first.commands.add('custom', 'first', async () => 7);
    first.levels.add('/first');
    first.markdown.use(pluginA);
    first.markdown.directive('custom', () => ({ raw: 'first' }));
    first.document.register(() => 'first document');
    first.pipeline.registerStage('custom', () => { calls.push('first'); }, { phase: 'emit' });

    assert.equal(second.commands.get('custom'), undefined);
    assert.deepEqual(second.levels.list(), []);
    assert.deepEqual(second.markdown.list(), []);
    assert.equal(second.markdown.directiveMappings().get('custom'), undefined);
    await assert.rejects(() => second.document.render(documentData), /no document handler registered/);

    second.commands.add('custom', 'second', async () => 9);
    second.levels.add('/second');
    second.markdown.directive('custom', () => ({ raw: 'second' }));
    second.document.register(() => 'second document');

    const args = { positional: [], flags: {}, config: { targets: {} }, cwd: '/fake' };

    assert.equal(await first.commands.get('custom')!.handler(args), 7);
    assert.equal(await second.commands.get('custom')!.handler(args), 9);
    assert.deepEqual(first.levels.list(), ['/first']);
    assert.deepEqual(first.markdown.directiveMappings().get('custom')!({ name: 'custom' }, {}, convert), { raw: 'first' });
    assert.equal(await first.document.render(documentData), 'first document');
    assert.equal(await second.document.render(documentData), 'second document');

    for (const env of [second, first]) {
        const pipeline = new Pipeline();

        env.pipeline.flush(pipeline);
        await pipeline.run({
            cwd: '/fake', configDir: '/fake/config', buildDir: '/fake/.build', outDir: '/fake/site',
            target: 'default', env, templates: new Templates(), store: {}, cache: new Map(),
        });

        assert.deepEqual(calls, env === second ? [] : ['first']);
    }
});
