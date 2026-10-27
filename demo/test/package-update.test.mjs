import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { selectVersions, updateDependencies, updatePackages } from '../scripts/update-packages.mjs';

const versions = { '@nuckty/core': '1.0.0-beta1' };
test('updates only allowlisted exact registry versions', async () => {
    const selected = await selectVersions(versions, 'beta', async (url) => {
        assert.equal(url, 'https://registry.npmjs.org/%40nuckty%2Fcore/beta');
        return { ok: true, json: async () => ({ name: '@nuckty/core', version: '1.0.0-beta2', dist: { tarball: 'https://registry.npmjs.org/@nuckty/core/-/core-1.0.0-beta2.tgz', integrity: 'sha512-fixture' } }) };
    });
    assert.deepEqual(selected, { '@nuckty/core': '1.0.0-beta2' });
    const manifest = { dependencies: { '@nuckty/core': '1.0.0-beta1', other: '2.0.0' } };
    assert.deepEqual(updateDependencies(manifest, selected).dependencies, { '@nuckty/core': '1.0.0-beta2', other: '2.0.0' });
});

for (const mutation of [
    { name: '@other/core' },
    { version: '^1.0.0' },
    { dist: { tarball: 'https://other.example/archive', integrity: 'sha512-fixture' } },
]) {
    test(`rejects invalid registry metadata ${JSON.stringify(mutation)}`, async () => {
        await assert.rejects(selectVersions(versions, 'beta', async () => ({ ok: true, json: async () => ({ name: '@nuckty/core', version: '1.0.0-beta2', dist: { tarball: 'https://registry.npmjs.org/archive.tgz', integrity: 'sha512-fixture' }, ...mutation }) })));
    });
}

test('rejects channels and packages outside the fixed release allowlist', async () => {
    await assert.rejects(selectVersions(versions, 'beta; echo unsafe'));
    await assert.rejects(selectVersions({ '@other/core': '1.0.0' }, 'beta'));
    assert.throws(() => updateDependencies({ dependencies: { '@nuckty/unrecognized': '1.0.0' } }, versions));
});

function fixture() {
    const directory = mkdtempSync(path.join(tmpdir(), 'nuckty-updater-test-'));
    mkdirSync(path.join(directory, 'config'));
    const names = Object.keys(JSON.parse(readFileSync(new URL('../config/config-packages.json', import.meta.url), 'utf8')));
    const current = Object.fromEntries(names.map((name) => [name, '1.0.0-beta1']));
    writeFileSync(path.join(directory, 'config/config-packages.json'), JSON.stringify(current));
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { '@nuckty/core': current['@nuckty/core'], thirdParty: '2.0.0' } }));
    const request = async (url) => {
        const name = decodeURIComponent(new URL(url).pathname.split('/')[1]);
        return { ok: true, json: async () => ({ name, version: name === '@nuckty/core' ? '1.0.0-beta2' : current[name], dist: { tarball: 'https://registry.npmjs.org/archive.tgz', integrity: 'sha512-fixture' } }) };
    };

    return { directory, current, request };
}

test('incompatible release peers leave manifest and selected versions untouched', async () => {
    const { directory, request } = fixture();
    const manifest = readFileSync(path.join(directory, 'package.json'), 'utf8');
    const selected = readFileSync(path.join(directory, 'config/config-packages.json'), 'utf8');

    try {
        await assert.rejects(updatePackages(directory, 'beta', request, (command, args, options) => {
            assert.equal(command, 'npm');
            assert.ok(args.includes('--strict-peer-deps'));
            assert.notEqual(options.cwd, directory);
            const all = JSON.parse(readFileSync(path.join(options.cwd, 'package.json'), 'utf8')).dependencies;
            assert.equal(Object.keys(all).length, 11);
            throw new Error('ERESOLVE incompatible core peer');
        }), /ERESOLVE/);
        assert.equal(readFileSync(path.join(directory, 'package.json'), 'utf8'), manifest);
        assert.equal(readFileSync(path.join(directory, 'config/config-packages.json'), 'utf8'), selected);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('compatible resolution updates only exact package inputs before lock generation', async () => {
    const { directory, request } = fixture();
    let calls = 0;

    try {
        await updatePackages(directory, 'beta', request, (command, args, options) => {
            calls += 1;
            assert.equal(command, 'npm');
            assert.ok(args.includes('--strict-peer-deps'));
            const manifest = JSON.parse(readFileSync(path.join(options.cwd, 'package.json'), 'utf8'));
            assert.equal(manifest.dependencies['@nuckty/core'], '1.0.0-beta2');

            if (options.cwd === directory) {
                assert.equal(manifest.dependencies.thirdParty, '2.0.0');
            }
        });
        assert.equal(calls, 2);
        assert.equal(JSON.parse(readFileSync(path.join(directory, 'config/config-packages.json'), 'utf8'))['@nuckty/core'], '1.0.0-beta2');
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('independently released compatible extension keeps the selected core version', async () => {
    const { directory, current } = fixture();
    const manifestFile = path.join(directory, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    manifest.dependencies['@nuckty/ext-block-gallery'] = current['@nuckty/ext-block-gallery'];
    writeFileSync(manifestFile, JSON.stringify(manifest));
    const request = async (url) => {
        const name = decodeURIComponent(new URL(url).pathname.split('/')[1]);
        return { ok: true, json: async () => ({ name, version: name === '@nuckty/ext-block-gallery' ? '1.0.0-beta2' : current[name], dist: { tarball: 'https://registry.npmjs.org/archive.tgz', integrity: 'sha512-fixture' } }) };
    };

    try {
        await updatePackages(directory, 'beta', request, () => {});
        const updated = JSON.parse(readFileSync(manifestFile, 'utf8'));
        assert.equal(updated.dependencies['@nuckty/core'], current['@nuckty/core']);
        assert.equal(updated.dependencies['@nuckty/ext-block-gallery'], '1.0.0-beta2');
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('unchanged public release set performs no install or input write', async () => {
    const { directory, current } = fixture();
    const before = readFileSync(path.join(directory, 'config/config-packages.json'), 'utf8');
    const request = async (url) => {
        const name = decodeURIComponent(new URL(url).pathname.split('/')[1]);
        return { ok: true, json: async () => ({ name, version: current[name], dist: { tarball: 'https://registry.npmjs.org/archive.tgz', integrity: 'sha512-fixture' } }) };
    };

    try {
        await updatePackages(directory, 'beta', request, () => assert.fail('No install expected'));
        assert.equal(readFileSync(path.join(directory, 'config/config-packages.json'), 'utf8'), before);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
