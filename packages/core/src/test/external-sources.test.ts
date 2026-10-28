import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseExternalSources } from '../utils/external.js';

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
    ];

    for (const [value, error] of cases) {
        assert.throws(() => parseExternalSources(value, 'config/external.json'), error);
    }
});
