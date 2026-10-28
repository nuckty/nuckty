import { AsyncLocalStorage } from 'node:async_hooks';
import type { Templates } from './templates.js';

const CONTEXT_KEY = Symbol.for('nuckty.templates.context');
const shared = globalThis as typeof globalThis & Record<symbol, unknown>;

function getContext(): AsyncLocalStorage<Templates> {
    const existing = shared[CONTEXT_KEY];

    if (existing instanceof AsyncLocalStorage) {
        return existing as AsyncLocalStorage<Templates>;
    }

    const context = new AsyncLocalStorage<Templates>();

    shared[CONTEXT_KEY] = context;

    return context;
}

export function runWithTemplates<T>(templates: Templates, callback: () => T): T {
    return getContext().run(templates, callback);
}

export function currentTemplates(): Templates | undefined {
    return getContext().getStore();
}
