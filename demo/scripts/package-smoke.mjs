/** Offline package boundary check. Source builds and consumer outputs stay in temp. */
import { realpathSync, mkdtempSync, mkdirSync, cpSync, symlinkSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { build as bundle } from 'esbuild';
import { sourceCopyFilter } from './copy-filter.mjs';

const demo = path.resolve(import.meta.dirname, '..');
const workspace = path.dirname(demo);
const temp = mkdtempSync(path.join(tmpdir(), 'nuckty-package-smoke-'));
const sources = path.join(temp, 'sources');
const consumer = path.join(temp, 'consumer with spaces – пример');
const packages = [
    'nuckty',
    'nuckty-ext-block-gallery',
    'nuckty-ext-block-grid',
    'nuckty-ext-block-root',
    'nuckty-ext-command-content-external',
    'nuckty-ext-command-convert-images',
    'nuckty-ext-command-deploy-ftp',
    'nuckty-ext-command-serve',
    'nuckty-ext-command-validate-vnu',
    'nuckty-ext-markdown-typography-ru',
    'nuckty-ext-markdown-video',
];
const userConfig = path.join(temp, 'user.npmrc');
const globalConfig = path.join(temp, 'global.npmrc');
writeFileSync(userConfig, '');
writeFileSync(globalConfig, '');
const npm = (args, cwd) => execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, npm_config_registry: 'https://registry.npmjs.org', npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: process.env.npm_config_cache ?? path.join(temp, 'cache') } });

try {
    mkdirSync(sources);
    mkdirSync(consumer);
    const dependencies = {};
    for (const name of packages) {
        const source = realpathSync(path.join(workspace, name));
        const copy = path.join(sources, name);
        cpSync(source, copy, { recursive: true, filter: sourceCopyFilter(source) });
        // Build tools are already installed locally. Packaged runtime is installed separately below.
        symlinkSync(path.join(source, 'node_modules'), path.join(copy, 'node_modules'), 'dir');
        const output = npm(['pack', '--json', '--offline', '--pack-destination', consumer], copy);
        const [packed] = JSON.parse(output.slice(output.lastIndexOf('\n[\n') + 1));
        const packageManifest = JSON.parse(readFileSync(path.join(copy, 'package.json'), 'utf8'));
        assert.ok(packageManifest.main, `${name}: package.json must declare main`);
        assert.ok(packageManifest.types, `${name}: package.json must declare types`);
        assert.ok(packed.files.some((file) => file.path === packageManifest.main), `${name}: main entry must be packed`);
        assert.ok(packed.files.some((file) => file.path === packageManifest.types), `${name}: types entry must be packed`);
        if (packageManifest.bin?.nuckty) {
            assert.ok(packed.files.some((file) => file.path === packageManifest.bin.nuckty), `${name}: CLI entry must be packed`);
        }
        assert.ok(!packed.files.some((file) => /(^|\/)(test|src)\//.test(file.path)), `${name}: source/test leaked into package`);
        const packedPaths = new Set(packed.files.map((file) => file.path));
        for (const file of packed.files.filter((entry) => entry.path.endsWith('.map'))) {
            const map = JSON.parse(readFileSync(path.join(copy, file.path), 'utf8'));
            for (const [index, sourcePath] of (map.sources ?? []).entries()) {
                const sourceFile = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), map.sourceRoot ?? '', sourcePath));
                assert.ok(typeof map.sourcesContent?.[index] === 'string' || packedPaths.has(sourceFile), `${name}: ${file.path} references missing source ${sourcePath}`);
            }
        }
        dependencies[name] = `file:./${packed.filename}`;
    }
    for (const name of ['config', 'content', 'blocks', 'ext']) cpSync(path.join(demo, name), path.join(consumer, name), {
        recursive: true,
        filter: sourceCopyFilter(demo),
    });
    const manifest = JSON.parse(readFileSync(path.join(demo, 'package.json'), 'utf8'));
    writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ type: 'module', scripts: { build: 'nuckty build', types: 'tsc --noEmit --strict --skipLibCheck false --module nodenext --target es2022 --types node smoke.ts' }, dependencies, devDependencies: { typescript: manifest.devDependencies.typescript, '@types/node': manifest.devDependencies['@types/node'], '@tanstack/highlight': manifest.devDependencies['@tanstack/highlight'] } }));
    const extensions = packages.slice(1);
    const config = [
        "import { defineNucktyConfig } from 'nuckty';",
        '',
        'export default defineNucktyConfig({',
        "    targets: { default: { configDir: 'config/', outDir: 'site/', lang: 'ru', host: 'localhost', data: { kind: 'demo' } } },",
        `    ext: ${JSON.stringify([...extensions, './ext/showcase.ts'])},`,
        '});',
        '',
    ].join('\n');
    writeFileSync(path.join(consumer, 'config', 'config-nuckty.ts'), config);
    // The demo's browser adapter uses pure engine source modules. Prebundle it
    // before removing source trees; the consumer still runs from tarballs only.
    await bundle({
        entryPoints: [path.join(demo, 'blocks/playground/playground.js')],
        outfile: path.join(consumer, 'blocks/playground/playground.js'),
        bundle: true, platform: 'browser', format: 'esm', target: 'es2022',
    });
    npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
    const extensionImports = extensions.map((name, index) => `import { register as extension${index} } from '${name}';`).join('\n');
    const extensionNames = extensions.map((_, index) => `extension${index}`).join(', ');
    writeFileSync(path.join(consumer, 'smoke.ts'), [
        "import { Templates, render, type NucktyEnv } from 'nuckty';",
        extensionImports,
        `const extensions: Array<(env: NucktyEnv) => void> = [${extensionNames}];`,
        'void extensions; void render({tag: \'p\', content: \'typed\'}, {templates: new Templates()});',
        '',
    ].join('\n'));
    npm(['run', 'types'], consumer);
    const version = execFileSync(path.join(consumer, 'node_modules/.bin/nuckty'), ['--version'], { cwd: consumer, encoding: 'utf8' });
    assert.ok(version.trim(), 'public symlink CLI must execute');
    npm(['run', 'build'], consumer);
    const html = readFileSync(path.join(consumer, 'site/html/index.html'), 'utf8');
    assert.match(html, /Возможности/);
    assert.match(readFileSync(path.join(consumer, 'site/html/playground.html'), 'utf8'), /playground-input/);
    assert.match(readFileSync(path.join(consumer, 'site/html/media.html'), 'utf8'), /class=gallery/);
    assert.match(html, /<title>/);
    assert.match(html, /<html[^>]*lang=/);
    const assets = readdirSync(path.join(consumer, 'site'), { recursive: true });
    const scripts = assets.filter((name) => name.endsWith('.js'));
    const styles = assets.filter((name) => name.endsWith('.css'));
    assert.ok(scripts.some((name) => readFileSync(path.join(consumer, 'site', name), 'utf8').includes('lightbox')), 'gallery lightbox JavaScript must be emitted');
    assert.ok(scripts.some((name) => html.includes(path.basename(name))), 'the document must load the emitted JavaScript');
    assert.ok(styles.some((name) => readFileSync(path.join(consumer, 'site', name), 'utf8').includes('.gallery')), 'gallery CSS must be emitted');
    assert.ok(styles.some((name) => readFileSync(path.join(consumer, 'site', name), 'utf8').includes('.grid')), 'grid CSS must be emitted');
    // The installed runtime must still work after its source snapshots disappear.
    rmSync(sources, { recursive: true, force: true });
    npm(['run', 'build'], consumer);
    process.stdout.write(`Package smoke passed: ${packages.length} tarballs, all public main/types/register entries, CLI, HTML, gallery/grid assets, source-independent rebuild from a path with spaces and Unicode.\n`);
} catch (error) {
    process.stderr.write(`Package smoke failed; fixture preserved at ${temp}\n`);
    throw error;
}
rmSync(temp, { recursive: true, force: true });
