/**
 * @nuckty/ext-block-root — the page wrapper block (`root`).
 *
 * A document and block extension (openspec `ext-block-root`): `register(env)`
 * maps `DocumentData` to a `root` node through `env.document` and adds the
 * package's `blocks/` directory through `env.levels`. The site may override
 * the supplied template on a later level without changing the handler.
 *
 * @module @nuckty/ext-block-root
 */

import type { NucktyEnv } from '@nuckty/core';
import { fileURLToPath } from 'node:url';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
    env.document.register((data) => ({
        block: 'root',
        props: { ...data },
        content: data.content,
    }));
}

export default register;
