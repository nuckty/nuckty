import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const versions = JSON.parse(readFileSync(new URL('config/config-packages.json', root), 'utf8'));

test('consumer installs exact public npm releases without ecosystem source checkouts', () => {
    const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    const packages = Object.entries(manifest.dependencies).filter(([name]) => name.startsWith('@nuckty/'));
    assert.ok(packages.length > 0);

    for (const [name, version] of packages) {
        assert.equal(version, versions[name], `${name} must use the selected published release`);
    }

    const workflow = readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8');
    assert.doesNotMatch(workflow, /NUCKTY_SOURCES|Install and build all package sources|path: nuckty-ext-|path: nuckty\n/);
});

test('browser previews use the published browser entry', () => {
    const file = 'blocks/playground/playground.js';
    const source = readFileSync(new URL(file, root), 'utf8');
    assert.match(source, /from '@nuckty\/core\/browser'/);
    assert.doesNotMatch(source, /@nuckty\/core\/src\//);
});

test('lockfile resolves Nuckty packages to integrity-pinned public releases', () => {
    const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));

    for (const [location, entry] of Object.entries(lock.packages)) {
        assert.ok(!entry.link, `${location}: local source link is forbidden`);

        if (!location.startsWith('node_modules/@nuckty/')) {
            continue;
        }

        assert.equal(entry.version, versions[location.slice('node_modules/'.length)]);
        assert.ok(entry.resolved.startsWith('https://registry.npmjs.org/'), `${location}: public registry archive required`);
        assert.ok(entry.integrity, `${location}: registry integrity required`);
    }
});
