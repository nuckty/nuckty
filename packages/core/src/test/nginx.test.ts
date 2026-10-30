/**
 * Tests for the nginx config generator (openspec `hosting` spec):
 * `generateNginxConfig(root, logPrefix)` builds a flat-URL, pre-compressed,
 * content-negotiated nginx.conf from data (no template engine). Non-trivial:
 * the config serves flat HTML pages with brotli>gzip negotiation, AVIF→WebP
 * →PNG→JPG→SVG→GIF image negotiation, immutable cache for hashed assets,
 * and security headers. A wrong map or missing header breaks serving.
 *
 * @module test/nginx
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNginxConfig } from '../stages/nginx.js';

const cfg = (root = '/var/www/site', logPrefix = 'nuckty'): string =>
    generateNginxConfig(root, logPrefix);

// ---- logPrefix (access/error log names) -------------------------------------

test('nginx: access/error logs use the logPrefix', () => {
    const c = cfg('/r', 'fixture');
    assert.ok(c.includes('access_log "/tmp/nginx-logs/fixture_access.log";'), c);
    assert.ok(c.includes('error_log "/tmp/nginx-logs/fixture_error.log";'), c);
});

test('nginx: logPrefix defaults to "nuckty"', () => {
    const c = cfg();
    assert.ok(c.includes('access_log "/tmp/nginx-logs/nuckty_access.log";'));
});

// ---- flat-URL map (URL → flat html filename) --------------------------------

test('nginx: flat-URL map turns "/" into index.html', () => {
    assert.ok(/"~\^\/\$"\s+"index\.html";/.test(cfg()), '/ → index.html');
});

test('nginx: flat-URL map flattens 1-5 URL levels to underscore-joined html', () => {
    const c = cfg();
    assert.ok(/"~\^\/\(\[\^\/\]\+\)\$"\s+"\$1\.html";/.test(c), '1 level');
    assert.ok(/"\$1_\$2\.html";/.test(c), '2 levels');
    assert.ok(/"\$1_\$2_\$3\.html";/.test(c), '3 levels');
    assert.ok(/"\$1_\$2_\$3_\$4\.html";/.test(c), '4 levels');
    assert.ok(/"\$1_\$2_\$3_\$4_\$5\.html";/.test(c), '5 levels');
});

// ---- compression negotiation (brotli > gzip) --------------------------------

test('nginx: encoding negotiation matches complete tokens and excludes q=0', () => {
    const c = cfg();
    const patterns = [...c.matchAll(/"~\*([^"\n]+)"\s+"(brotli|gzip)\/"/g)];
    const select = (header: string): string | undefined => patterns.find((match) => new RegExp(match[1]!, 'i').test(header))?.[2];

    assert.equal(select('br, gzip'), 'brotli');
    assert.equal(select('br;q=0, gzip;q=1'), 'gzip');
    assert.equal(select('br;q=0.000,gzip;q=0'), undefined);
    assert.equal(select('xbr, xgzip'), undefined);
    assert.equal(select('BR; q=0.5, gzip'), 'brotli');
});

test('nginx: compression suffix/content-encoding map (br/.gz)', () => {
    const c = cfg();
    assert.ok(/"brotli\/"\s+".br";/.test(c), 'brotli suffix .br');
    assert.ok(/"gzip\/"\s+".gz";/.test(c), 'gzip suffix .gz');
    assert.ok(/"brotli\/"\s+"br";/.test(c), 'brotli content-encoding br');
    assert.ok(/"gzip\/"\s+"gzip";/.test(c), 'gzip content-encoding gzip');
});

// ---- image negotiation order (AVIF → WebP → PNG → JPG → SVG → GIF) ------------

test('nginx: hashed-image location tries formats in AVIF→WebP→PNG→JPG→SVG→GIF order', () => {
    const c = cfg();
    const tryLine = c.split('\n').find((l) => l.includes('try_files $avif_dir/'));
    assert.ok(tryLine, 'no hashed-image try_files line');
    assert.ok(tryLine!.includes('$avif_dir/$hash.avif $webp_dir/$hash.webp /png/$hash.png /jpg/$hash.jpg /jpg/$hash.jpeg /svg/$hash.svg /$hash.gif /webp/$hash.webp =404'), tryLine);
});

test('nginx: no locations for asset names the build never produces', () => {
    assert.ok(!/location ~ \^\/_[cjs]/.test(cfg()));
});

test('nginx: hashed images get immutable cache + Vary: Accept', () => {
    const c = cfg();
    const imgBlock = c.slice(c.indexOf('Hash-prefixed images'), c.indexOf('HTML pages with pre-compression'));
    assert.ok(imgBlock.includes('expires 10y'));
    assert.ok(imgBlock.includes('Cache-Control "public,immutable" always'));
    assert.ok(imgBlock.includes('Vary "Accept" always'));
});

// ---- hashed static cache control --------------------------------------------

test('nginx: hashed static assets (css/js/svg/images) get 10y immutable', () => {
    const c = cfg();
    assert.ok(c.includes('expires_time'));
    assert.ok(c.includes('1   10y;    # Hashed assets'));
    assert.ok(c.includes('1   "public, immutable"'));
});

test('nginx: HTML/PDF/ZIP get no-cache (1h, public no-cache)', () => {
    const c = cfg();
    assert.ok(c.includes('0   1h;     # HTML, PDF, ZIP'));
    assert.ok(c.includes('0   "public, no-cache"'));
});

// ---- security headers (HTML location) --------------------------------------

test('nginx: HTML location adds security headers', () => {
    const c = cfg();
    const htmlBlock = c.slice(c.indexOf('location /'), c.indexOf('Non-compressible'));
    assert.ok(htmlBlock.includes('X-Frame-Options "SAMEORIGIN"'));
    assert.ok(htmlBlock.includes('X-Content-Type-Options "nosniff"'));
    assert.ok(htmlBlock.includes('Referrer-Policy "strict-origin-when-cross-origin"'));
    assert.ok(htmlBlock.includes('charset utf-8'));
});

// ---- compression dirs blocked, trailing-slash redirect ---------------------

test('nginx: direct access to brotli/ gzip/ dirs is blocked (404)', () => {
    const c = cfg();
    assert.ok(c.includes('location ~ ^/(brotli|gzip)(/|$)'));
    assert.ok(c.includes('return 404'));
});

test('nginx: trailing slashes redirect (301) to the no-slash URL', () => {
    const c = cfg();
    assert.ok(c.includes('location ~ ^(.+)/$'));
    assert.ok(c.includes('return 301 $1'));
});

// ---- root / pid / listen ----------------------------------------------------

test('nginx: root points at the outDir, pid defaults to /tmp/nginx.pid, listens on 8080', () => {
    const c = cfg('/var/www/site', 'p');
    assert.ok(c.includes('root "/var/www/site";'));
    assert.ok(c.includes('pid "/tmp/nginx.pid";'));
    assert.ok(c.includes('listen 127.0.0.1:8080;'));
});

test('nginx: an explicit pidFile is used (project-scoped serve)', () => {
    const c = generateNginxConfig('/var/www/site', 'p', '/proj/.build/nginx.pid');
    assert.ok(c.includes('pid "/proj/.build/nginx.pid";'));
    assert.ok(!c.includes('pid "/tmp/nginx.pid";'));
});

test('nginx: a trailing slash on root is stripped', () => {
    const c = cfg('/var/www/site/', 'p');
    assert.ok(c.includes('root "/var/www/site";'));
    assert.ok(!c.includes('root "/var/www/site/";'));
});

test('nginx: filesystem paths are quoted and escape quotes and backslashes', () => {
    const c = generateNginxConfig('/tmp/site "quoted" \\dir Ω/', 'serve', '/tmp/build "quoted"/nginx.pid', 8080, '/tmp/logs \\quoted');

    assert.ok(['/etc/nginx/mime.types', '/opt/homebrew/etc/nginx/mime.types', '/usr/local/etc/nginx/mime.types'].some((file) => c.includes(`include "${file}";`)));
    assert.ok(c.includes('pid "/tmp/build \\"quoted\\"/nginx.pid";'), c);
    assert.ok(c.includes('access_log "/tmp/logs \\\\"quoted/serve_access.log";') || c.includes('access_log "/tmp/logs \\\\quoted/serve_access.log";'), c);
    assert.ok(c.includes('root "/tmp/site \\"quoted\\" \\\\dir Ω";'), c);
    assert.ok(c.includes('client_body_temp_path "/tmp/nginx_client_temp";'));
});

test('nginx: filesystem paths reject dollar variables and config control characters', () => {
    assert.throws(() => generateNginxConfig('/tmp/site$root'), /must not contain "\$"/);
    assert.throws(() => generateNginxConfig('/tmp/site', 'bad$prefix'), /must not contain "\$"/);
    assert.throws(() => generateNginxConfig('/tmp/site', 'ok', '/tmp/build\nnginx.pid'), /control characters/);
    assert.throws(() => generateNginxConfig(''), /must not be empty/);
});

test('nginx: sitemap.xml is served with compression negotiation', () => {
    const c = cfg();
    assert.ok(c.includes('location = /sitemap.xml'));
    assert.ok(c.includes('set $target_file "xml/sitemap.xml"'));
});

test('nginx: compressed assets use the original request URI for immutable caching', () => {
    assert.ok(cfg().includes('map $request_uri $is_hashed_static'));
});

test('nginx: internal custom error route bypasses cached flat HTML mapping', () => {
    const c = cfg();
    const error = c.slice(c.indexOf('location = /__nuckty_404'), c.indexOf('location = /robots.txt'));

    assert.ok(c.includes('error_page 404 /__nuckty_404;'));
    assert.ok(error.includes('internal;'));
    assert.ok(error.includes('/html/404.html'));
    assert.ok(error.includes('${compression_dir}404.html$compression_suffix'));
    assert.ok(error.includes('Cache-Control "public, no-cache" always'));
    assert.ok(!error.includes('$flat_html'));
});

test('nginx: robots and sitemap map to their actual artifact paths', () => {
    const c = cfg();

    assert.ok(c.includes('location = /robots.txt'));
    assert.ok(c.includes('try_files /robots.txt =404;'));
    assert.ok(c.includes('${compression_dir}sitemap.xml$compression_suffix'));
});

test('nginx: explicit serving port is validated and rendered', () => {
    assert.ok(generateNginxConfig('/out', 'test', '/build/nginx.pid', 9090).includes('listen 127.0.0.1:9090;'));
    for (const port of [0, -1, 65536, 1.5, NaN]) {
        assert.throws(() => generateNginxConfig('/out', 'test', undefined, port), /Invalid nginx port/);
    }
});

test('nginx: serving logs can stay in the project build directory', () => {
    const c = generateNginxConfig('/out', 'serve', '/build/nginx.pid', 8080, '/build/nginx-logs');

    assert.ok(c.includes('access_log "/build/nginx-logs/serve_access.log";'));
    assert.ok(c.includes('error_log "/build/nginx-logs/serve_error.log";'));
});
