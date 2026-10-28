/**
 * Store reads use own keys; writes must preserve prototype-looking keys
 * without changing the object's prototype.
 *
 * @module test/stages-types
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStore, writeStore } from '../stages/types.js';

test('writeStore + readStore round-trips a typed artifact', () => {
    const store: Record<string, unknown> = {};
    writeStore(store, 'cssHash', { page: { hash: 'abc', filename: 'abc.css', url: '/abc.css', source: [] } });
    const out = readStore<{ page: { hash: string } }>(store, 'cssHash');
    assert.ok(out);
    assert.equal(out.page.hash, 'abc');
});

test('readStore returns undefined for a missing key', () => {
    const store: Record<string, unknown> = {};
    assert.equal(readStore(store, 'absent'), undefined);
});

test('writeStore overwrites a previous value', () => {
    const store: Record<string, unknown> = {};
    writeStore(store, 'k', 1);
    writeStore(store, 'k', 2);
    assert.equal(readStore<number>(store, 'k'), 2);
});

test('store helpers preserve __proto__ without mutating the store prototype', () => {
    const store = {};
    writeStore(store, '__proto__', { safe: true });
    assert.deepEqual(readStore(store, '__proto__'), { safe: true });
    assert.equal(Object.getPrototypeOf(store), Object.prototype);
    assert.equal(readStore({}, 'constructor'), undefined);
});

