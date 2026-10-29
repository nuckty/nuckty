/** Opt-in native hosting regression: NUCKTY_HOSTING_HTTP=1 npm run test:unit. */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { brotliCompressSync, brotliDecompressSync, gzipSync, gunzipSync } from 'node:zlib';
import { generateHtaccess } from '../../stages/htaccess.js';
import { generateNginxConfig } from '../../stages/nginx.js';

const exec = promisify(execFile);
const enabled = process.env.NUCKTY_HOSTING_HTTP === '1';
const marker = '<!doctype html><title>Missing</title>CUSTOM404';

async function unusedPort(): Promise<number> {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    return address.port;
}

interface Response {
    status: number | undefined;
    headers: http.IncomingHttpHeaders;
    body: string;
}

function request(port: number, url: string, headers: Record<string, string>): Promise<Response> {
    return new Promise((resolve, reject) => {
        const req = http.get({ hostname: '127.0.0.1', port, path: url, headers, timeout: 2000 }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
                try {
                    let bytes = Buffer.concat(chunks);
                    if (res.headers['content-encoding'] === 'br') {
                        bytes = brotliDecompressSync(bytes);
                    }
                    if (res.headers['content-encoding'] === 'gzip') {
                        bytes = gunzipSync(bytes);
                    }
                    resolve({ status: res.statusCode, headers: res.headers, body: bytes.toString() });
                } catch (error) {
                    reject(error);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('Hosting request timed out')));
    });
}

for (const server of ['nginx', 'apache']) {
    test(`${server}: native HTTP negotiation, artifact routes and custom 404`, { skip: !enabled, timeout: 20000 }, async () => {
        assert.ok(['darwin', 'linux'].includes(process.platform), 'Native hosting fixtures support macOS and Linux');
        const tempPrefix = server === 'nginx' ? 'nuckty hosting Ω-' : 'nuckty-hosting-';
        const root = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));
        const out = path.join(root, 'artifact');
        const port = await unusedPort();
        const files: Record<string, string> = {
            'html/index.html': '<title>ROOT</title>',
            'html/404.html': marker,
            'html/a_b.html': 'NESTED',
            'css/aaaaaaaaaaaaaaaa.css': 'body{color:red}',
            'css/dddddddddddddddd.css': 'body{color:blue}',
            'js/bbbbbbbbbbbbbbbb.js': 'console.log(1)',
            'svg/cccccccccccccccc.svg': '<svg/>',
            'xml/sitemap.xml': '<urlset/>',
            'robots.txt': 'User-agent: *',
            'manifest.json': '{}',
            'notes.txt': 'PLAIN TEXT',
            'nested/readme.txt': 'NESTED TEXT',
            'html/release.txt.html': '<title>DOTTED PAGE</title>',
            'html/nested_notes.txt.html': '<title>DOTTED PAGE WITH SHARED BASENAME</title>',
            '_c5555555555555555': 'body{color:green}',
            '_j6666666666666666': 'console.log(2)',
            '_s7777777777777777': '<svg>LEGACY</svg>',
            'jpg/1111111111111111.jpeg': 'JPEG',
            '2222222222222222.gif': 'GIF',
            'png/3333333333333333.png': 'PNG',
            'webp/3333333333333333.webp': 'WEBP',
            'webp/4444444444444444.webp': 'WEBP-ORIGINAL',
            'avif/3333333333333333.avif': 'AVIF',
        };
        const write = async (name: string, data: string | Buffer): Promise<void> => {
            const file = path.join(out, name);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, data);
        };
        for (const [name, data] of Object.entries(files)) {
            await write(name, data);
            if (/\.(html|css|js|svg|xml|txt)$/.test(name) || /^_[cjs][a-f0-9]{16}$/.test(name)) {
                await write(`brotli/${path.basename(name)}.br`, brotliCompressSync(data));
                await write(`gzip/${path.basename(name)}.gz`, gzipSync(data));
            }
        }
        await fs.rm(path.join(out, 'brotli/dddddddddddddddd.css.br'));
        await write('.htaccess', `${generateHtaccess(out)}\nErrorDocument 404 /404\n`);
        const config = path.join(root, `${server}.conf`);
        let binary: string;
        let args: string[];
        if (server === 'nginx') {
            binary = process.platform === 'darwin' ? '/opt/homebrew/bin/nginx' : '/usr/sbin/nginx';
            const generated = generateNginxConfig(out, 'fixture', path.join(root, 'nginx.pid'))
                .replace('worker_processes auto;', 'worker_processes 1;')
                .replace('http {', 'http {\n    gzip on;\n    gzip_min_length 0;\n    gzip_types text/css application/javascript image/svg+xml application/xml;')
                .replace('listen 127.0.0.1:8080;', `listen 127.0.0.1:${port};`)
                .replaceAll('/tmp/nginx-logs/', `${root}/`)
                .replaceAll('/tmp/nginx_', `${root}/nginx_`);
            await fs.writeFile(config, generated);
            args = ['-e', path.join(root, 'global-error.log'), '-p', `${root}/`, '-c', config];
            await exec(binary, [...args, '-t']);
            args.push('-g', 'daemon off;');
        } else {
            binary = process.platform === 'darwin' ? '/usr/sbin/httpd' : '/usr/sbin/apache2';
            const moduleDir = process.platform === 'darwin' ? '/usr/libexec/apache2' : '/usr/lib/apache2/modules';
            const modules = ['mpm_prefork', 'authz_core', 'dir', 'mime', 'rewrite', 'headers', 'expires'];

            if (process.platform === 'darwin') {
                modules.push('unixd');
            }
            const loads = modules.map((name) => `LoadModule ${name}_module ${moduleDir}/mod_${name}.so`).join('\n');
            const mimeTypes = process.platform === 'darwin' ? '/etc/apache2/mime.types' : '/etc/mime.types';
            await fs.writeFile(config, `ServerRoot "${root}"
PidFile "${root}/httpd.pid"
Listen 127.0.0.1:${port}
ServerName localhost
ErrorLog "${root}/error.log"
${loads}
TypesConfig ${mimeTypes}
DocumentRoot "${out}"
<Directory "${out}">
AllowOverride All
Require all granted
Options FollowSymLinks
</Directory>
`);
            await exec(binary, ['-t', '-f', config]);
            args = ['-f', config, '-DFOREGROUND'];
        }
        const child = spawn(binary, args, { stdio: 'ignore', detached: true });
        try {
            let ready = false;
            for (let attempt = 0; attempt < 30; attempt++) {
                try {
                    await request(port, '/', {});
                    ready = true;
                    break;
                } catch {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
            }
            assert.ok(ready, `${server} did not start`);
            for (const [url, source] of [['/', 'html/index.html'], ['/a/b', 'html/a_b.html'], ['/aaaaaaaaaaaaaaaa.css', 'css/aaaaaaaaaaaaaaaa.css'], ['/bbbbbbbbbbbbbbbb.js', 'js/bbbbbbbbbbbbbbbb.js'], ['/cccccccccccccccc.svg', 'svg/cccccccccccccccc.svg'], ['/sitemap.xml', 'xml/sitemap.xml']]) {
                for (const [encoding, expected] of [['identity', undefined], ['br', 'br'], ['gzip', 'gzip'], ['gzip, deflate, br', 'br'], ['br;q=0, gzip;q=1', 'gzip'], ['br;q=0.000,gzip;q=0', undefined]]) {
                    const response = await request(port, url!, { 'Accept-Encoding': encoding! });
                    assert.equal(response.status, 200, url);
                    assert.equal(response.body, files[source!], url);
                    assert.equal(response.headers['content-encoding'], expected, url);
                    assert.match(response.headers.vary ?? '', /Accept-Encoding/, url);
                    if (source!.startsWith('html/')) {
                        assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN', url);
                        assert.equal(response.headers['x-content-type-options'], 'nosniff', url);
                        assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin', url);
                    }
                    if (/\.(css|js|svg)$/.test(url!)) {
                        assert.match(response.headers['cache-control'] ?? '', /immutable/, url);
                    }
                }
            }
            for (const [url, source] of [
                ['/_c5555555555555555', '_c5555555555555555'],
                ['/_j6666666666666666', '_j6666666666666666'],
                ['/_s7777777777777777', '_s7777777777777777'],
                ['/notes.txt', 'notes.txt'],
                ['/nested/readme.txt', 'nested/readme.txt'],
                ['/release.txt', 'html/release.txt.html'],
                ['/nested/notes.txt', 'html/nested_notes.txt.html'],
            ]) {
                for (const [encoding, expected] of [['identity', undefined], ['br', 'br'], ['gzip', 'gzip'], ['br;q=0,gzip;q=0', undefined]]) {
                    const response = await request(port, url!, { 'Accept-Encoding': encoding! });

                    assert.equal(response.status, 200, url);
                    assert.equal(response.body, files[source!], url);
                    assert.equal(response.headers['content-encoding'], expected, url);
                    assert.match(response.headers.vary ?? '', /Accept-Encoding/, url);
                    if (source!.endsWith('.txt')) {
                        assert.match(response.headers['content-type'] ?? '', /^text\/plain/, url);
                    } else if (source!.startsWith('html/')) {
                        assert.match(response.headers['content-type'] ?? '', /^text\/html/, url);
                    } else {
                        assert.match(response.headers['cache-control'] ?? '', /immutable/, url);
                    }
                }
            }
            for (const [accept, expected] of [['br,gzip', 'gzip'], ['br;q=0.5,gzip;q=0.2', 'gzip'], ['br,gzip;q=0', undefined], ['br', undefined]]) {
                const response = await request(port, '/dddddddddddddddd.css', { 'Accept-Encoding': accept! });

                assert.equal(response.status, 200);
                assert.equal(response.body, files['css/dddddddddddddddd.css']);
                assert.equal(response.headers['content-encoding'], expected, 'missing Brotli must retain an accepted Gzip fallback');
                assert.match(response.headers.vary ?? '', /Accept-Encoding/);
                assert.match(response.headers['cache-control'] ?? '', /immutable/);
            }
            for (const [accept, expected] of [['image/png', 'PNG'], ['image/webp', 'WEBP'], ['image/avif', 'AVIF'], ['image/avif;q=0,image/webp;q=0,image/png', 'PNG']]) {
                const response = await request(port, '/_i3333333333333333', { Accept: accept! });
                assert.equal(response.status, 200);
                assert.equal(response.body, expected);
                assert.match(response.headers.vary ?? '', /Accept/);
            }
            for (const [url, body] of [['/_i4444444444444444', 'WEBP-ORIGINAL'], ['/_i1111111111111111', 'JPEG'], ['/_i2222222222222222', 'GIF'], ['/robots.txt', files['robots.txt']]]) {
                const response = await request(port, url!, {});
                assert.equal(response.status, 200);
                assert.equal(response.body, body);
            }
            const queryRoute = await request(port, '/?download=guide.html', {});
            assert.equal(queryRoute.status, 200, 'query must not trigger direct HTML denial');
            assert.equal(queryRoute.body, files['html/index.html']);
            for (const url of ['/missing', '/missing/nested', '/missing.txt', '/404.html', '/manifest.json', '/a/b/c/d/e/f', '/brotli/aaaaaaaaaaaaaaaa.css.br', '/gzip/aaaaaaaaaaaaaaaa.css.gz']) {
                for (const encoding of ['identity', 'gzip', 'br']) {
                    const response = await request(port, url, { 'Accept-Encoding': encoding });
                    assert.equal(response.status, 404, url);
                    assert.equal(response.body, marker, url);
                    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN', url);
                    assert.equal(response.headers['x-content-type-options'], 'nosniff', url);
                    assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin', url);
                    assert.equal(response.headers['content-encoding'], encoding === 'identity' ? undefined : encoding, url);
                    assert.doesNotMatch(response.headers['cache-control'] ?? '', /immutable/, url);
                }
            }
            for (const [url, source, status] of [
                ['/', 'html/index.html', 200],
                ['/a/b', 'html/a_b.html', 200],
                ['/aaaaaaaaaaaaaaaa.css', 'css/aaaaaaaaaaaaaaaa.css', 200],
                ['/bbbbbbbbbbbbbbbb.js', 'js/bbbbbbbbbbbbbbbb.js', 200],
                ['/cccccccccccccccc.svg', 'svg/cccccccccccccccc.svg', 200],
                ['/sitemap.xml', 'xml/sitemap.xml', 200],
                ['/notes.txt', 'notes.txt', 200],
                ['/nested/readme.txt', 'nested/readme.txt', 200],
                ['/_c5555555555555555', '_c5555555555555555', 200],
                ['/_j6666666666666666', '_j6666666666666666', 200],
                ['/_s7777777777777777', '_s7777777777777777', 200],
                ['/missing', 'html/404.html', 404],
            ] as const) {
                await fs.rm(path.join(out, 'brotli', `${path.basename(source)}.br`));
                const response = await request(port, url, { 'Accept-Encoding': 'br,gzip' });

                assert.equal(response.status, status, url);
                assert.equal(response.body, files[source], url);
                assert.equal(response.headers['content-encoding'], 'gzip', url);
                assert.match(response.headers.vary ?? '', /Accept-Encoding/, url);
                if (source.startsWith('html/')) {
                    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN', url);
                    assert.equal(response.headers['x-content-type-options'], 'nosniff', url);
                    assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin', url);
                    assert.match(response.headers['cache-control'] ?? '', /no-cache/, url);
                } else if (/\.(css|js|svg)$/.test(source)) {
                    assert.match(response.headers['cache-control'] ?? '', /immutable/, url);
                }
            }
        } finally {
            if (child.exitCode === null && child.signalCode === null) {
                child.kill('SIGTERM');
                await new Promise<void>((resolve) => child.once('exit', () => resolve()));
            }
            await fs.rm(root, { recursive: true, force: true });
        }
    });
}

