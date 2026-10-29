import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateHtaccess } from '../stages/htaccess.js';

const config = generateHtaccess('/artifact');

test('Apache rejects direct HTML, codec and manifest requests only outside internal error handling', () => {
    assert.match(config, /RewriteCond %\{ENV:REDIRECT_STATUS\} \^\$\nRewriteCond %\{THE_REQUEST\}/);
    assert.equal(config.split('RewriteCond %{ENV:REDIRECT_STATUS} ^$').length, 4);
    assert.ok(config.includes('RewriteRule ^manifest\\.json$ - [R=404,L,NC]'));
    assert.match(config, /brotli\|gzip/);
});

test('Apache encoding and modern image negotiation excludes zero quality and partial tokens', () => {
    for (const token of ['br', 'gzip', 'image/avif', 'image/webp']) {
        const line = config.split('\n').find((entry) => entry.startsWith('RewriteCond %{HTTP:') && entry.includes(`*${token}[ ]*`));
        assert.ok(line, token);
        const pattern = line.match(/"([^"]+)"/)?.[1];
        assert.ok(pattern, token);
        const regex = new RegExp(pattern, 'i');

        assert.ok(regex.test(token));
        assert.ok(regex.test(`${token};q=0.5`));
        assert.ok(!regex.test(`${token};q=0`));
        assert.ok(!regex.test(`${token};q=0.000, another`));
        assert.ok(!regex.test(`x${token}`));
    }
});

test('Apache routes identity text assets and preserves JPEG/GIF original extensions', () => {
    for (const ext of ['css', 'js', 'svg', 'xml']) {
        assert.ok(config.includes(`RewriteRule ^([^/]+\\.${ext})$ ${ext}/$1 [L]`));
    }
    assert.ok(config.includes('jpg/$1.jpeg [L,E=IS_IMAGE:1]'));
    assert.ok(config.includes('$1.gif [L,E=IS_IMAGE:1]'));
    assert.ok(config.includes('Header always merge Vary "Accept-Encoding"'));
    assert.ok(!config.includes('Header always set Content-Encoding'));
});
