/** Verify all public npm packages in an isolated registry-only consumer. */
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { sourceCopyFilter } from './copy-filter.mjs';

const demo = path.resolve(import.meta.dirname, '..');
const temp = mkdtempSync(path.join(tmpdir(), 'nuckty-package-smoke-'));
const consumer = path.join(temp, 'consumer with spaces – пример');
const dependencies = JSON.parse(readFileSync(path.join(demo, 'config/config-packages.json'), 'utf8'));
const packages = Object.keys(dependencies);
const userConfig = path.join(temp, 'user.npmrc');
const globalConfig = path.join(temp, 'global.npmrc');
writeFileSync(userConfig, '');
writeFileSync(globalConfig, '');
const npm = (args, cwd) => execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, npm_config_registry: 'https://registry.npmjs.org', npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: process.env.npm_config_cache ?? path.join(temp, 'cache') } });

try {
    mkdirSync(consumer);
    for (const name of ['config', 'content', 'blocks', 'ext']) cpSync(path.join(demo, name), path.join(consumer, name), {
        recursive: true,
        filter: sourceCopyFilter(demo),
    });
    const manifest = JSON.parse(readFileSync(path.join(demo, 'package.json'), 'utf8'));
    writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ type: 'module', scripts: { build: 'nuckty build', types: 'tsc --noEmit --strict --skipLibCheck false --module nodenext --target es2022 --types node smoke.ts' }, dependencies, devDependencies: { typescript: manifest.devDependencies.typescript, '@types/node': manifest.devDependencies['@types/node'], '@tanstack/highlight': manifest.devDependencies['@tanstack/highlight'] } }));
    const extensions = Object.keys(dependencies).filter((name) => name !== '@nuckty/core');
    const config = [
        "import { defineNucktyConfig } from '@nuckty/core';",
        '',
        'export default defineNucktyConfig({',
        "    targets: { default: { configDir: 'config/', outDir: 'site/', lang: 'ru', host: 'localhost', data: { kind: 'demo' } } },",
        `    ext: ${JSON.stringify([...extensions, './ext/showcase.ts'])},`,
        '});',
        '',
    ].join('\n');
    writeFileSync(path.join(consumer, 'config', 'config-nuckty.ts'), config);
    npm(['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
    const lock = JSON.parse(readFileSync(path.join(consumer, 'package-lock.json'), 'utf8'));

    for (const name of packages) {
        const entry = lock.packages[`node_modules/${name}`];
        assert.equal(entry.version, dependencies[name]);
        assert.ok(entry.resolved.startsWith('https://registry.npmjs.org/'), `${name}: public registry archive required`);
        assert.ok(entry.integrity, `${name}: registry integrity required`);
        const installed = JSON.parse(readFileSync(path.join(consumer, 'node_modules', name, 'package.json'), 'utf8'));
        assert.ok(installed.main && installed.types, `${name}: public entries required`);
        assert.ok(!readdirSync(path.join(consumer, 'node_modules', name)).includes('src'), `${name}: sources must not ship`);
    }

    const extensionImports = extensions.map((name, index) => `import { register as extension${index} } from '${name}';`).join('\n');
    const extensionNames = extensions.map((_, index) => `extension${index}`).join(', ');
    writeFileSync(path.join(consumer, 'smoke.ts'), [
        "import { Templates, render, type NucktyEnv } from '@nuckty/core';",
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
    process.stdout.write(`Package smoke passed: ${packages.length} public registry releases, all public main/types/register entries, CLI, HTML, gallery/grid assets, standalone build from a path with spaces and Unicode.\n`);
} catch (error) {
    process.stderr.write(`Package smoke failed; fixture preserved at ${temp}\n`);
    throw error;
}
rmSync(temp, { recursive: true, force: true });
