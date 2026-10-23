import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const supplied = args.filter((arg) => arg !== '--fix');
const files = supplied.length > 0 ? supplied : execFileSync('git', [
    'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md', ':!vendor/**',
], { encoding: 'utf8' }).split('\0').filter(Boolean);

for (const file of new Set(files)) {
    const original = readFileSync(file, 'utf8');
    const normalized = original.replace(/(?:\r?\n[\t ]*)*$/, '') + '\n';

    if (original === normalized) {
        continue;
    }
    if (fix) {
        writeFileSync(file, normalized);
    } else {
        console.error(`${file}: expected exactly one final LF without trailing blank lines`);
        process.exitCode = 1;
    }
}
