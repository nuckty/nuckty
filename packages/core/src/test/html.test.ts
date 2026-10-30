/**
 * Tests for the html stage's flat-URL mapper `urlToFlat` (openspec `hosting` /
 * `html-output`): a page URL becomes a flat filename the nginx stage serves.
 * Non-trivial: `/` → `index.html`, `/free/12v` → `free_12v.html`, deeper paths
 * join with underscores — a wrong mapping means the built page and the URL the
 * nginx config points at disagree, so the route 404s.
 *
 * The full html stage (two-pass render through a layout block) is covered by
 * `render.test.ts` (the two-pass engine + scoped block templates); this
 * file pins the URL→filename contract the stage writes under.
 *
 * @module test/html
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { htmlStage, urlToFlat } from '../stages/html.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';
import type { BuildContext } from '../pipeline/pipeline.js';

test('urlToFlat: "/" → index.html', () => {
    assert.equal(urlToFlat('/'), 'index.html');
});

test('urlToFlat: "" → index.html (empty treated as root)', () => {
    assert.equal(urlToFlat(''), 'index.html');
});

test('urlToFlat: a single-segment URL becomes "<seg>.html"', () => {
    assert.equal(urlToFlat('/free'), 'free.html');
});

test('urlToFlat: a two-segment URL joins segments with an underscore', () => {
    // /free/12v → free_12v.html (the canonical flat-URL form the nginx map expects).
    assert.equal(urlToFlat('/free/12v'), 'free_12v.html');
});

test('urlToFlat: deeper paths join all segments with underscores', () => {
    assert.equal(urlToFlat('/a/b/c'), 'a_b_c.html');
    assert.equal(urlToFlat('/common/software/yandex-music'), 'common_software_yandex-music.html');
});

test('urlToFlat: the leading slash is dropped before joining', () => {
    // /free/12v starts with a slash; the output must not begin with "_".
    assert.equal(urlToFlat('/free/12v')[0], 'f');
});

test('urlToFlat: a trailing slash is rejected (it would flatten to a trailing "_")', () => {
    // /about/ currently flattens to "about_.html" while hosting 301-redirects
    // to /about — the URL form must match hosting's canonical no-slash form.
    assert.throws(() => urlToFlat('/about/'), /trailing slash/);
    assert.equal(urlToFlat('/about'), 'about.html');
});

test('urlToFlat: 5 path segments are supported (documented hosting depth)', () => {
    assert.equal(urlToFlat('/a/b/c/d/e'), 'a_b_c_d_e.html');
});

test('urlToFlat: 6 path segments are rejected (hosting only serves depth 5)', () => {
    // Without this check the emitter can write a file hosting will 404.
    assert.throws(() => urlToFlat('/a/b/c/d/e/f'), /at most 5/);
});

test('html stage delegates document construction to a consumer handler', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-html-'));
    const env = new NucktyEnv();
    const templates = new Templates();
    let receivedUrl = '';

    env.document.register((data) => {
        receivedUrl = data.page.url;

        return { block: 'consumer-document', content: data.content };
    });

    const ctx: BuildContext = {
        cwd: dir,
        configDir: path.join(dir, 'config'),
        buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'),
        target: 'default',
        env,
        templates,
        store: {
            sitemap: {
                sitemap: [],
                pages: {
                    '/custom': {
                        file: 'custom.md',
                        url: '/custom',
                        name: 'Custom',
                        title: 'Custom',
                        section: null,
                        breadcrumbs: [],
                        tree: [{ block: 'article', content: 'Hello' }],
                    },
                },
                md2url: {},
                md2urls: {},
                url2md: {},
            },
        },
        cache: new Map(),
    };

    try {
        await htmlStage(ctx);

        assert.equal(receivedUrl, '/custom');
        assert.match(
            await readFile(path.join(ctx.outDir, 'html', 'custom.html'), 'utf8'),
            /class=consumer-document/,
        );
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('html stage rejects /a/b vs /a_b collision before writing either file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-html-'));
    const env = new NucktyEnv();
    const ctx: BuildContext = {
        cwd: dir,
        configDir: path.join(dir, 'config'),
        buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'),
        target: 'default',
        env,
        templates: new Templates(),
        store: {
            sitemap: {
                sitemap: [],
                pages: {
                    '/a/b': { file: 'a/b.md', url: '/a/b', name: 'A/B', title: 'A/B', section: null, breadcrumbs: [], tree: [] },
                    '/a_b': { file: 'a_b.md', url: '/a_b', name: 'A_B', title: 'A_B', section: null, breadcrumbs: [], tree: [] },
                },
                md2url: {},
                md2urls: {},
                url2md: {},
            },
        },
        cache: new Map(),
    };

    try {
        await assert.rejects(async () => await htmlStage(ctx), /URL collision.*a_b\.html/);
        // Nothing was written: neither page may overwrite the other.
        assert.equal(existsSync(path.join(ctx.outDir, 'html', 'a_b.html')), false);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('urlToFlat rejects non-canonical paths before emission', () => {
    for (const url of ['/a//b', '/a/../b', '/a/./b', '/a?x', '/a#b', '/a%2fb', '/a\\b']) {
        assert.throws(() => urlToFlat(url), /non-canonical/);
    }
});

test('html stage without typography preserves raw code and ordinary spacing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-html-spacing-'));
    const env = new NucktyEnv();
    env.document.register((data) => ({ tag: 'main', content: data.content }));
    const original = '<a href="/">a</a> — b<pre class="code">a  b\n  c</pre><CODE lang="x">a  b</CODE>';
    const ctx: BuildContext = {
        cwd: dir, configDir: path.join(dir, 'config'), buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'), target: 'default', env, templates: new Templates(),
        store: { sitemap: { sitemap: [], md2url: {}, md2urls: {}, url2md: {}, pages: { '/': { file: 'index.md', url: '/', name: 'Home', title: 'Home', section: null, breadcrumbs: [], tree: [{ raw: original }] } } } },
        cache: new Map(),
    };
    try {
        await htmlStage(ctx);
        assert.ok((await readFile(path.join(ctx.outDir, 'html', 'index.html'), 'utf8')).includes(original));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('html stage links alternates only to sibling pages that exist, with their titles', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-html-alternates-'));
    const targets = [
        { name: 'ru', configDir: 'config/ru/', outDir: 'site/ru/', lang: 'ru', host: 'example.ru', group: 'site' },
        { name: 'en', configDir: 'config/en/', outDir: 'site/en/', lang: 'en', host: 'example.com', group: 'site' },
    ];
    const received = new Map<string, unknown>();
    const env = new NucktyEnv();
    env.document.register((data) => {
        received.set(data.page.url, [...data.alternates]);

        return { tag: 'main', content: data.page.name };
    });
    const page = (url: string, name: string) => ({ file: `${name}.md`, url, name, title: name, section: null, breadcrumbs: [], tree: [] });

    try {
        await mkdir(path.join(dir, 'config/en'), { recursive: true });
        await writeFile(path.join(dir, 'config/en/site.json'), JSON.stringify({ rootTitle: 'Site' }));
        await writeFile(path.join(dir, 'config/en/sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n  - Shared [/shared, shared.md]\n');
        await htmlStage({
            cwd: dir, configDir: path.join(dir, 'config/ru'), buildDir: path.join(dir, '.build'), outDir: path.join(dir, 'site/ru'),
            target: 'ru', env, templates: new Templates(), cache: new Map(),
            store: {
                currentTarget: targets[0]!, allTargets: targets,
                sitemap: { sitemap: [], pages: { '/shared': page('/shared', 'Общая'), '/only-ru': page('/only-ru', 'Только') }, md2url: {}, md2urls: {}, url2md: {} },
            },
        });

        assert.deepEqual(received.get('/shared'), [['en', { url: 'https://example.com/shared', title: 'Shared | Home', host: 'example.com' }]]);
        assert.deepEqual(received.get('/only-ru'), []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
