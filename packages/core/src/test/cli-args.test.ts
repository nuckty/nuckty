/**
 * Direct in-process tests for the CLI argument parser (`parseArgs`) extracted
 * from `src/bin/nuckty.ts`. The parser is a pure function (the only testable
 * seam of the CLI entry point — the rest of `main()` does I/O: loader
 * registration, dynamic imports, `process.exit`). These cover positional
 * tokens, boolean flags, value flags, `--help`/`-h`, `--version`/`-v`, and the
 * edge cases that drive command dispatch (unknown commands, flag-only
 * invocations, value-flag vs boolean-flag disambiguation).
 *
 * The child-process `cli-commands.test.ts` suite covers the same parser
 * end-to-end as black-box behavior; this suite covers the source lines
 * directly under coverage.
 *
 * @module test/cli-args
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateCommandArgs } from '../bin/parse-args.js';

test('parseArgs: positional tokens are collected in order', () => {
    const r = parseArgs(['build', 'extra']);
    assert.deepEqual(r.positional, ['build', 'extra']);
    assert.deepEqual(r.flags, {});
    assert.equal(r.help, false);
    assert.equal(r.version, false);
});

test('parseArgs: a bare --flag is recorded as boolean true', () => {
    const r = parseArgs(['greet', 'bob', '--loud']);
    assert.deepEqual(r.positional, ['greet', 'bob']);
    assert.equal(r.flags['loud'], true);
});

test('parseArgs: a --flag followed by a non-flag value records the value', () => {
    const r = parseArgs(['greet', '--name', 'carol']);
    assert.deepEqual(r.positional, ['greet']);
    assert.equal(r.flags['name'], 'carol');
});

test('parseArgs: declared boolean flags leave a following target positional', () => {
    const r = parseArgs(['deploy-ftp', '--dry-run', 'staging', '--force'], {
        booleanFlags: ['dry-run', 'force'],
    });
    assert.deepEqual(r.positional, ['deploy-ftp', 'staging']);
    assert.equal(r.flags['dry-run'], true);
    assert.equal(r.flags['force'], true);
});

test('parseArgs: equals forms preserve explicit boolean flag values', () => {
    const r = parseArgs(['deploy-ftp', '--dry-run=false', '--force=true'], {
        booleanFlags: ['dry-run', 'force'],
    });
    assert.deepEqual(r.positional, ['deploy-ftp']);
    assert.equal(r.flags['dry-run'], 'false');
    assert.equal(r.flags['force'], 'true');
});

test('parseArgs: generic value flags retain separated and equals forms', () => {
    assert.equal(parseArgs(['greet', '--name', 'carol']).flags['name'], 'carol');
    assert.equal(parseArgs(['greet', '--name=carol']).flags['name'], 'carol');
});

test('parseArgs: __proto__ is stored as an own enumerable flag without changing the prototype', () => {
    const r = parseArgs(['greet', '--__proto__=value']);
    assert.equal(Object.getPrototypeOf(r.flags), Object.prototype);
    assert.equal(Object.hasOwn(r.flags, '__proto__'), true);
    assert.equal(r.flags['__proto__'], 'value');
});

test('parseArgs: -- ends option parsing and preserves extra positional arguments', () => {
    const r = parseArgs(['deploy-ftp', '--dry-run', '--', 'staging', '--force'], {
        booleanFlags: ['dry-run', 'force'],
    });
    assert.deepEqual(r.positional, ['deploy-ftp', 'staging', '--force']);
    assert.equal(r.flags['dry-run'], true);
    assert.equal(r.flags['force'], undefined);
});

test('parseArgs: a --flag immediately followed by another --flag is boolean, not a value', () => {
    // --loud is followed by --name (starts with --) → loud is boolean, name its own flag.
    const r = parseArgs(['greet', '--loud', '--name']);
    assert.equal(r.flags['loud'], true);
    assert.equal(r.flags['name'], true);
});

test('parseArgs: the last value wins for a repeated flag', () => {
    const r = parseArgs(['greet', '--name', 'a', '--name', 'b']);
    assert.equal(r.flags['name'], 'b');
});

test('parseArgs: --help / -h set the help boolean', () => {
    assert.equal(parseArgs(['--help']).help, true);
    assert.equal(parseArgs(['-h']).help, true);
    assert.equal(parseArgs(['build']).help, false);
});

test('parseArgs: --version / -v set the version boolean', () => {
    assert.equal(parseArgs(['--version']).version, true);
    assert.equal(parseArgs(['-v']).version, true);
});

test('parseArgs: --help does not consume the following token as a value', () => {
    // --help is a recognized switch, not a value flag; a trailing positional stays positional.
    const r = parseArgs(['--help', 'build']);
    assert.equal(r.help, true);
    assert.deepEqual(r.positional, ['build']);
});

test('parseArgs: an empty argv yields empty positional, no flags, no switches', () => {
    const r = parseArgs([]);
    assert.deepEqual(r.positional, []);
    assert.deepEqual(r.flags, {});
    assert.equal(r.help, false);
    assert.equal(r.version, false);
});

test('parseArgs: flags without a value before end of argv are boolean', () => {
    const r = parseArgs(['greet', '--loud']);
    assert.equal(r.flags['loud'], true);
});

test('parseArgs: build command with a target positional drives dispatch', () => {
    const r = parseArgs(['build', 'extra']);
    assert.equal(r.positional[0], 'build');
    assert.equal(r.positional[1], 'extra');
});

test('parseArgs: unknown command positional is preserved for dispatch to reject', () => {
    const r = parseArgs(['frobnicate', '--x']);
    assert.equal(r.positional[0], 'frobnicate');
    assert.equal(r.flags['x'], true);
});

test('validateCommandArgs rejects undeclared options and extra positionals and normalizes switches', () => {
    const command = { flags: { force: 'boolean', port: 'string' } as const, maxPositionals: 1 };

    assert.deepEqual(validateCommandArgs(command, { positional: ['en'], flags: { force: 'false', port: '8080' } }), { positional: ['en'], flags: { force: false, port: '8080' } });
    assert.deepEqual(validateCommandArgs(command, { positional: [], flags: { force: true } }).flags, { force: true });
    assert.throws(() => validateCommandArgs(command, { positional: [], flags: { forse: true } }), /unknown option --forse/);
    assert.throws(() => validateCommandArgs(command, { positional: [], flags: { '': true } }), /unknown option --$/);
    assert.throws(() => validateCommandArgs(command, { positional: [], flags: { force: 'maybe' } }), /--force accepts only true or false/);
    assert.throws(() => validateCommandArgs(command, { positional: [], flags: { port: true } }), /--port requires a value/);
    assert.throws(() => validateCommandArgs(command, { positional: ['a', 'b'], flags: {} }), /at most 1 argument$/);
    assert.throws(() => validateCommandArgs({ flags: {}, maxPositionals: 0 }, { positional: ['a'], flags: {} }), /at most 0 arguments$/);
    assert.deepEqual(validateCommandArgs({ flags: {}, maxPositionals: Infinity }, { positional: ['a', 'b'], flags: {} }).positional, ['a', 'b']);
});
