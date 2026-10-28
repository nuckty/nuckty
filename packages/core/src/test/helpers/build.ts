import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { runBuild as build, type BuildCommand } from '../../build.js';

const output = new AsyncLocalStorage<{ messages: string[]; active: boolean }>();
const write = process.stdout.write;

// Isolate concurrent build logs; test-runner output outside a build still flows.
process.stdout.write = function (this: typeof process.stdout, ...args: unknown[]): boolean {
    const captured = output.getStore();

    if (!captured || !captured.active) {
        return Reflect.apply(write, this, args);
    }
    captured.messages.push(String(args[0]));
    const callback = args.find((value) => typeof value === 'function');

    if (typeof callback === 'function') {
        process.nextTick(() => Reflect.apply(callback, undefined, []));
    }

    return true;
};

export async function runBuild(command: BuildCommand): Promise<void> {
    const captured = { messages: [] as string[], active: true };

    try {
        await output.run(captured, () => build(command));
    } finally {
        captured.active = false;

        for (const message of captured.messages.join('').split('\n').filter(Boolean)) {
            assert.match(message, /^nuckty: built target ".+" → .+$/, 'unexpected build stdout must not be hidden');
        }
    }
}

