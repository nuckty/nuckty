/** Share the same boundary for every sibling source copied by release checks. */
import { lstatSync } from 'node:fs';
import path from 'node:path';

const excluded = new Set(['node_modules', '.git', 'dist', 'site', 'site-en', '.cache', '.preview', '.build', 'external', 'plans', '.npmrc', '.codex', '.agents', '.coverage', '.coverage-source', 'coverage']);
const privateConfigFiles = new Set(['config/auth-ftp.json', 'config/auth-ftp.yml']);

export function sourceCopyFilter(source) {
    return (entry) => {
        const base = path.basename(entry);
        const relative = path.relative(source, entry).split(path.sep).join('/');

        return !excluded.has(base) && !base.startsWith('.env') && !entry.endsWith('.tgz')
            && !privateConfigFiles.has(relative) && !lstatSync(entry).isSymbolicLink();
    };
}
