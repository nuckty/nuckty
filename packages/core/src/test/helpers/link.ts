import { mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** Link the local core package into a consumer so `import '@nuckty/core'` resolves to its dist and dependencies. */
export async function linkNuckty(consumerDir: string): Promise<void> {
    const link = path.join(consumerDir, 'node_modules', '@nuckty', 'core');

    await mkdir(path.dirname(link), { recursive: true });
    await symlink(PACKAGE_ROOT, link, 'dir');
}
