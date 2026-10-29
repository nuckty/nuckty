import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promoteLatest, publicPackages } from './promote-latest.mjs';

const packages = ['@nuckty/core', '@nuckty/ext-a'];

function fakeRegistry({ published = packages, tags = {}, lag = 0, rate = 0, fail } = {}) {
    const state = Object.fromEntries(packages.map((name) => [name, { latest: '1.0.0-rc.0', rc: '1.0.0-rc.1', beta: '1.0.0-beta3', ...tags[name] }]));
    const writes = [];
    let reads = 0;
    let limited = rate;
    const json = (body, status = 200, headers = {}) => ({ ok: status < 400, status, json: async () => body, headers: new Headers(headers) });

    return {
        writes,
        state,
        request: async (url) => {
            if (fail && url.includes(fail.match)) {
                return json({}, fail.status);
            }
            if (limited > 0) {
                limited -= 1;
                return json({}, 429, { 'retry-after': '3' });
            }
            const name = decodeURIComponent(url.replace(/^https:\/\/registry\.npmjs\.org\/(-\/package\/)?/, '').replace(/\/dist-tags$/, ''));

            if (url.endsWith('/dist-tags')) {
                reads += 1;
                return json(reads <= lag ? { ...state[name], latest: '1.0.0-rc.0' } : { ...state[name] });
            }
            return json({ 'dist-tags': { ...state[name] }, versions: published.includes(name) ? { '1.0.0-rc.1': {} } : {} });
        },
        run: async (command, args) => {
            assert.equal(command, 'npm');
            writes.push(args);
            const [name, version] = args[2].split(/@(?=[^@]+$)/);
            state[name].latest = version;
        },
    };
}

function clock() {
    let time = 0;
    const waits = [];
    return { now: () => time, sleep: async (ms) => { waits.push(ms); time += ms; }, waits };
}

test('promotes only latest after verifying every package and reads all tags back', async () => {
    const registry = fakeRegistry({ lag: 1 });
    const time = clock();
    await promoteLatest({ version: '1.0.0-rc.1', packages, ...registry, ...time, log: () => {} });
    assert.deepEqual(registry.writes, packages.map((name) => ['dist-tag', 'add', `${name}@1.0.0-rc.1`, 'latest', '--registry=https://registry.npmjs.org']));
    for (const name of packages) {
        assert.deepEqual(registry.state[name], { latest: '1.0.0-rc.1', rc: '1.0.0-rc.1', beta: '1.0.0-beta3' });
    }
    assert.deepEqual(time.waits, [10000]);
});

test('a version missing from any package stops before the first write', async () => {
    const registry = fakeRegistry({ published: ['@nuckty/core'] });
    await assert.rejects(promoteLatest({ version: '1.0.0-rc.1', packages, ...registry, ...clock(), log: () => {} }), /@nuckty\/ext-a@1\.0\.0-rc\.1 is not published/);
    assert.deepEqual(registry.writes, []);
});

test('inputs that are not exact versions are rejected before registry access', async () => {
    for (const version of ['', 'latest', '1.0', '1.0.0-rc.1; rm -rf /', '1.0.0+build', '^1.0.0', undefined]) {
        const registry = fakeRegistry();
        await assert.rejects(promoteLatest({ version, packages, ...registry, request: async () => assert.fail('registry accessed'), ...clock(), log: () => {} }), /exact semantic version/);
        assert.deepEqual(registry.writes, []);
    }
});

test('429 waits for Retry-After and permission errors fail without retries', async () => {
    const limited = fakeRegistry({ rate: 2 });
    const time = clock();
    await promoteLatest({ version: '1.0.0-rc.1', packages, ...limited, ...time, log: () => {} });
    assert.deepEqual(time.waits.slice(0, 2), [3000, 3000]);

    const denied = fakeRegistry({ fail: { match: 'ext-a', status: 403 } });
    const deniedTime = clock();
    await assert.rejects(promoteLatest({ version: '1.0.0-rc.1', packages, ...denied, ...deniedTime, log: () => {} }), /returned 403/);
    assert.deepEqual(denied.writes, []);
    assert.deepEqual(deniedTime.waits, []);

    const writeDenied = fakeRegistry();
    let attempts = 0;
    await assert.rejects(promoteLatest({ version: '1.0.0-rc.1', packages, ...writeDenied, run: async () => { attempts += 1; throw new Error('E403'); }, ...clock(), log: () => {} }), /E403/);
    assert.equal(attempts, 1);
});

test('a changed tag other than latest fails the read-back', async () => {
    const registry = fakeRegistry();
    const run = async (command, args) => {
        await registry.run(command, args);
        registry.state['@nuckty/core'].rc = '9.9.9';
    };
    await assert.rejects(promoteLatest({ version: '1.0.0-rc.1', packages, ...registry, run, ...clock(), log: () => {} }), /other than latest changed/);
});

test('read-back gives up at the deadline', async () => {
    const registry = fakeRegistry({ lag: 1000 });
    await assert.rejects(promoteLatest({ version: '1.0.0-rc.1', packages, ...registry, ...clock(), budget: 30000, log: () => {} }), /did not read back/);
});

test('public packages are the eleven official workspace packages', () => {
    const names = publicPackages(path.resolve(import.meta.dirname, '..'));
    assert.equal(names.length, 11);
    assert.ok(names.includes('@nuckty/core') && names.every((name) => name.startsWith('@nuckty/')));
});
