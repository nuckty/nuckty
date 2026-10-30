import assert from 'node:assert/strict';
import { test } from 'node:test';
import { externalRepoName, parseExternalSources } from '../utils/external.js';

test('string and object external entries normalize to sources', () => {
    assert.deepEqual(parseExternalSources([
        'git@github.com:acme/content.git',
        { url: 'https://github.com/nuckty/nuckty.git', ref: 'v1.0.0', path: 'docs' },
        { url: 'https://github.com/acme/assets.git', ref: 'a'.repeat(40) },
        { url: 'https://github.com/acme/guides.git', path: 'site/guides' },
    ]), [
        { url: 'git@github.com:acme/content.git' },
        { url: 'https://github.com/nuckty/nuckty.git', ref: 'v1.0.0', path: 'docs' },
        { url: 'https://github.com/acme/assets.git', ref: 'a'.repeat(40) },
        { url: 'https://github.com/acme/guides.git', path: 'site/guides' },
    ]);
});

test('malformed external entries name the file and entry', () => {
    const cases: Array<[unknown, RegExp]> = [
        [{}, /must contain an array/],
        [[''], /entry 1: url must not be empty/],
        [[42], /entry 1: expected a URL string/],
        [[{ ref: 'v1' }], /entry 1: url must be a non-empty string/],
        [[{ url: 'u', branch: 'main' }], /entry 1: unknown field "branch"/],
        [['u', { url: 'u', ref: '-c core.sshCommand=x' }], /entry 2: ref must be/],
        [[{ url: 'u', ref: 'v1..v2' }], /ref must be/],
        [[{ url: 'u', ref: 'tags/' }], /ref must be/],
        [[{ url: 'u', path: '../docs' }], /path must be/],
        [[{ url: 'u', path: '/docs' }], /path must be/],
        [[{ url: 'u', path: 'docs/./api' }], /path must be/],
        [[{ url: 'u', path: '-docs' }], /path must be/],
        [[{ url: 'u', path: 'docs/*' }], /path must be/],
        [[{ url: 'u', path: 'docs/..' }], /path must be/],
    ];

    for (const [value, error] of cases) {
        assert.throws(() => parseExternalSources(value, 'config/external.json'), error);
    }
});

test('dot-prefixed and plus-sign path segments are accepted', () => {
    assert.deepEqual(parseExternalSources([{ url: 'u', path: '.vitepress' }, { url: 'u', path: 'docs/c++' }]).map((source) => source.path), ['.vitepress', 'docs/c++']);
});

test('external repository names follow the URL path after an scp host', () => {
    assert.equal(externalRepoName('git@github.com:acme/content.git'), 'content');
    assert.equal(externalRepoName('git@host:content.git'), 'content');
    assert.equal(externalRepoName('https://github.com/nuckty/nuckty'), 'nuckty');
    assert.equal(externalRepoName('ssh://git@host:22/acme/assets.git'), 'assets');
    assert.equal(externalRepoName('https://github.com/acme/content'), 'content');
});

test('external repository names must be plain directory segments', () => {
    assert.throws(() => externalRepoName(''), /Could not parse/);
    for (const url of ['https://h/o/..', 'https://h/o/.', 'https://h/o/repo\\nested.git', 'https://host/   ']) {
        assert.throws(() => externalRepoName(url), /Unsafe repository name/);
    }
});

test('rejected repository names do not disclose query or fragment values', () => {
    for (const url of ['https://host/org/repo.git?token=SYNTHETIC_SECRET', 'https://host/org/repo.git#SYNTHETIC_SECRET']) {
        assert.throws(() => externalRepoName(url), (error: Error) => {
            assert.match(error.message, /Unsafe repository name/);
            assert.doesNotMatch(error.message, /SYNTHETIC_SECRET/);
            return true;
        });
    }
});
