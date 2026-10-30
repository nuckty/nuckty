import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from '../index.js';
import { NucktyEnv, validateCommandArgs, type CommandArgs } from '@nuckty/core';

function args(overrides: Partial<CommandArgs> = {}): CommandArgs {
    return {
        positional: [],
        flags: {},
        config: { targets: {} } as CommandArgs['config'],
        cwd: '/path/that/must/not/be-read',
        ...overrides,
    };
}

test('validate declares --port and at most one target', () => {
    const env = new NucktyEnv();
    register(env);
    const entry = env.commands.get('validate')!;

    assert.throws(() => validateCommandArgs(entry, { positional: [], flags: { target: 'second' } }), /unknown option --target/);
    assert.throws(() => validateCommandArgs(entry, { positional: [], flags: { '': true } }), /unknown option --$/);
    assert.throws(() => validateCommandArgs(entry, { positional: ['first', 'second'], flags: {} }), /at most 1 argument/);
    assert.deepEqual(validateCommandArgs(entry, { positional: ['en'], flags: { port: '9999' } }).flags, { port: '9999' });
});

for (const port of [true, '', '0', '65536', '1.5', 'wrong']) {
    test(`validate rejects invalid port ${String(port)} before starting Java`, async () => {
        const env = { commands: { add: (_name: string, _description: string, handler: (args: CommandArgs) => Promise<number>) => { run = handler; } } };
        let run!: (args: CommandArgs) => Promise<number>;
        register(env as unknown as NucktyEnv);
        const stderr = process.stderr.write;
        let message = '';
        process.stderr.write = ((chunk: string) => { message += chunk; return true; }) as typeof stderr;

        try {
            assert.equal(await run(args({ flags: { port } })), 1);
            assert.match(message, /--port must be an integer/);
        } finally {
            process.stderr.write = stderr;
        }
    });
}
