/**
 * Tests for target config + cross-target hreflang alternates.
 *
 * @module test/targets
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    defineNucktyConfig,
    resolveTarget,
    allTargets,
    resolveAlternates,
} from '../targets/config.js';

const syntheticSites = defineNucktyConfig({
    targets: {
        'main-ru': { configDir: 'config-user/', outDir: 'dist/main-ru/', lang: 'ru', host: 'ru.example.com', group: 'user' },
        'main-en': { configDir: 'config-user/', outDir: 'dist/main-en/', lang: 'en', host: 'en.example.com', group: 'user' },
        'dev-ru': { configDir: 'config-dev/', outDir: 'dist/dev-ru/', lang: 'ru', host: 'dev.example.com', group: 'dev' },
        'dev-en': { configDir: 'config-dev/', outDir: 'dist/dev-en/', lang: 'en', host: 'dev-en.example.com', group: 'dev' },
    },
    ext: [],
});

test('defineNucktyConfig rejects zero targets', () => {
    assert.throws(() => defineNucktyConfig({ targets: {} }), /at least one target/);
});

test('allTargets returns 4 with names', () => {
    const ts = allTargets(syntheticSites);
    assert.equal(ts.length, 4);
    assert.ok(ts.every((t) => t.name && t.configDir && t.outDir));
});

test('resolveTarget by name', () => {
    const t = resolveTarget(syntheticSites, 'main-en');
    assert.equal(t.lang, 'en');
    assert.equal(t.host, 'en.example.com');
});

test('resolveTarget unknown throws', () => {
    assert.throws(() => resolveTarget(syntheticSites, 'nope'), /unknown target/);
    assert.throws(() => resolveTarget(syntheticSites, 'constructor'), /unknown target/);
    assert.throws(() => resolveTarget({ targets: {} }, undefined), /at least one target/);
});

test('resolveTarget undefined → first', () => {
    const t = resolveTarget(syntheticSites, undefined);
    assert.equal(t.name, 'main-ru');
});

test('resolveAlternates: ru finds en sibling within group', () => {
    const current = resolveTarget(syntheticSites, 'main-ru');
    const alts = resolveAlternates(current, allTargets(syntheticSites), '/features', { 'main-en': { '/features': { title: 'Features' } } });
    assert.equal(alts.size, 1);
    const en = alts.get('en')!;
    assert.equal(en.host, 'en.example.com');
    assert.equal(en.url, 'https://en.example.com/features');
    assert.equal(en.title, 'Features');
});

test('resolveAlternates: does NOT cross groups', () => {
    const current = resolveTarget(syntheticSites, 'main-ru');
    const alts = resolveAlternates(current, allTargets(syntheticSites), '/');
    // dev-* targets are group 'dev', not matched.
    assert.equal(alts.size, 1);
    assert.equal(alts.get('en')!.host, 'en.example.com');
});

test('resolveAlternates: no group → no alternates', () => {
    const alts = resolveAlternates(
        { name: 't', configDir: 'c/', outDir: 'o/' },
        [{ name: 't', configDir: 'c/', outDir: 'o/' }],
        '/x',
    );
    assert.equal(alts.size, 0);
});

test('resolveAlternates excludes another target with the current language', () => {
    const current = resolveTarget(syntheticSites, 'main-ru');
    const siblings = [...allTargets(syntheticSites), {
        ...current, name: 'ru-mirror', host: 'mirror.example',
    }];
    const alts = resolveAlternates(current, siblings, '/');
    assert.deepEqual([...alts.keys()], ['en']);
});

test('resolveAlternates: dev-ru finds dev-en', () => {
    const current = resolveTarget(syntheticSites, 'dev-ru');
    const alts = resolveAlternates(current, allTargets(syntheticSites), '/arch');
    assert.equal(alts.size, 1);
    assert.equal(alts.get('en')!.host, 'dev-en.example.com');
});

test('alternate titles use only explicitly supplied own dictionary keys', () => {
    for (const name of ['constructor', 'toString', '__proto__']) {
        const current = { name: 'main', configDir: 'config', outDir: 'site', lang: 'ru', host: 'example.ru', group: 'site' };
        const sibling = { ...current, name, lang: 'en', host: 'example.com' };
        const inherited = Object.create({ [name]: { '/page': { title: 'Inherited title' } } }) as Record<string, Record<string, { title: string }>>;
        const explicit: Record<string, Record<string, { title: string }>> = Object.create(null);
        explicit[name] = { '/page': { title: 'Translated title' } };

        assert.equal(resolveAlternates(current, [current, sibling], '/page', {}).get('en')?.title, '', name);
        assert.equal(resolveAlternates(current, [current, sibling], '/page', inherited).get('en')?.title, '', name);
        assert.equal(resolveAlternates(current, [current, sibling], '/page', explicit).get('en')?.title, 'Translated title', name);
    }
});

test('resolveAlternates skips a sibling whose sitemap lacks the route', () => {
    const current = resolveTarget(syntheticSites, 'main-ru');
    const pages = { 'main-en': { '/other': { title: 'Other' } } };

    assert.equal(resolveAlternates(current, allTargets(syntheticSites), '/features', pages).size, 0);
    assert.equal(resolveAlternates(current, allTargets(syntheticSites), '/other', pages).get('en')?.title, 'Other');
});

test('alternate languages ignore ASCII case while retaining distinct regional tags', () => {
    const current = { name: 'main', configDir: 'config', outDir: 'site', lang: 'en-US', host: 'us.example.com', group: 'site' };
    const same = { ...current, name: 'same', lang: 'EN-us', host: 'same.example.com' };
    const other = { ...current, name: 'other', lang: 'en-GB', host: 'gb.example.com' };
    const alternates = resolveAlternates(current, [current, same, other], '/page');

    assert.deepEqual([...alternates.keys()], ['en-GB']);
    assert.equal(alternates.get('en-GB')?.url, 'https://gb.example.com/page');
});
