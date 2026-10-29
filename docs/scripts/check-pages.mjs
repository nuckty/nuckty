/** Check that pages.json lists every documentation page exactly once and each page exists in English and Russian. */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const excluded = new Set(['README', 'AGENTS', 'CLAUDE']);
const issues = [];

async function collect(directory, prefix = '') {
    const pages = [];

    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const name = path.posix.join(prefix, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'scripts' && !entry.name.startsWith('.')) {
                pages.push(...await collect(path.join(directory, entry.name), name));
            }
        } else if (entry.name.endsWith('.md')) {
            const page = name.replace(/(?:\.ru)?\.md$/, '');

            if (!excluded.has(page)) {
                pages.push(page);
            }
        }
    }

    return pages;
}

const order = JSON.parse(await readFile(path.join(root, 'pages.json'), 'utf8'));

if (!Array.isArray(order) || !order.every((page) => typeof page === 'string')) {
    throw new Error('pages.json must be an array of page paths');
}

const listed = new Set();

for (const page of order) {
    if (listed.has(page)) {
        issues.push(`pages.json: ${page} is listed twice`);
    }
    listed.add(page);

    for (const suffix of ['.md', '.ru.md']) {
        if (!existsSync(path.join(root, page + suffix))) {
            issues.push(`pages.json: ${page}${suffix} does not exist`);
        }
    }
}
for (const page of new Set(await collect(root))) {
    if (!listed.has(page)) {
        issues.push(`pages.json: ${page} is not listed`);
    }
}
if (issues.length > 0) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Checked ${order.length} pages in pages.json.`);
}
