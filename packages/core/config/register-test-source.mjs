/** Resolve source .js specifiers to TypeScript without compacting coverage lines. */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.startsWith('file:')
            && /\.ts(?:\?|$)/.test(context.parentURL)
            && /^(?:\.\/|\.\.\/).+\.js$/.test(specifier)) {
            const source = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);

            if (existsSync(fileURLToPath(source))) {
                return nextResolve(source.href, context);
            }
        }

        return nextResolve(specifier, context);
    },
});
