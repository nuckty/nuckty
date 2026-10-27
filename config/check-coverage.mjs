/** Check c8's source-mapped summary without discarding bundled CLI coverage. */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const sourceRoot = path.join(projectRoot, 'src');
const thresholds = JSON.parse(readFileSync(new URL('./config-coverage.json', import.meta.url), 'utf8'));
const summaryPath = path.resolve(process.argv[2] ?? 'coverage/coverage-summary.json');
const report = JSON.parse(readFileSync(summaryPath, 'utf8'));

function collectSourceFiles(dir) {
    const files = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'test') {
            continue;
        }
        const file = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...collectSourceFiles(file));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            files.push(file);
        }
    }

    return files;
}

const typeOnlyEntries = new Set(['index.ts', 'browser.ts', 'bem/template-types.ts']);

for (const file of collectSourceFiles(sourceRoot)) {
    if (!typeOnlyEntries.has(path.relative(sourceRoot, file)) && !report[file]) {
        throw new Error(`Missing source coverage entry: ${file}`);
    }
}

function percent(entry, metric, label) {
    const value = entry?.[metric]?.pct;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Missing ${metric} coverage for ${label}`);
    }
    return value;
}

for (const [metric, minimum] of Object.entries(thresholds.global)) {
    const measured = percent(report.total, metric, 'all source files');
    if (measured < minimum) {
        throw new Error(`Coverage ${metric} ${measured}% is below ${minimum}% overall`);
    }
}

let sourceFiles = 0;
for (const [file, coverage] of Object.entries(report)) {
    if (file === 'total') continue;
    const relative = path.relative(sourceRoot, file);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !file.endsWith('.ts')) {
        throw new Error(`Unexpected coverage entry outside production TypeScript: ${file}`);
    }
    sourceFiles++;
    const measured = percent(coverage, 'lines', relative);
    if (measured < thresholds.perFileLines) {
        throw new Error(`Coverage lines ${measured}% is below ${thresholds.perFileLines}% for src/${relative}`);
    }
}

if (sourceFiles === 0 || !report[path.join(sourceRoot, 'bin/nuckty.ts')]) {
    throw new Error('Source coverage is empty or missing the CLI entry');
}
