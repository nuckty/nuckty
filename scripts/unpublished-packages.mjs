/** Print public workspace packages whose manifest version is not yet in the npm registry. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pending = [];

for (const name of readdirSync(path.join(root, 'packages'))) {
    const manifest = JSON.parse(readFileSync(path.join(root, 'packages', name, 'package.json'), 'utf8'));

    if (manifest.private) {
        continue;
    }
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(manifest.name)}/${manifest.version}`, { headers: { 'cache-control': 'no-cache' } });

    if (response.status === 404) {
        pending.push(`${manifest.name}@${manifest.version}`);
    } else if (!response.ok) {
        throw new Error(`${manifest.name}@${manifest.version}: registry returned ${response.status}`);
    }
}
console.log(pending.join('\n'));
