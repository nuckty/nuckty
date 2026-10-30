/** Keep native source ranges separate from transformed or tree-shaken duplicates. */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, realpathSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function selectCoverageScripts(report, projectRoot) {
    const source = pathToFileURL(path.join(projectRoot, 'src') + path.sep).href;
    const bin = pathToFileURL(path.join(projectRoot, 'dist', 'bin') + path.sep).href;
    const maps = report['source-map-cache'] ?? {};
    const result = report.result.filter((script) => {
        return script.url.startsWith(bin)
            || (script.url.startsWith(source) && !maps[script.url]?.data);
    });
    const kept = new Set(result.map((script) => script.url));

    return { ...report, result, 'source-map-cache': Object.fromEntries(Object.entries(maps).filter(([url]) => kept.has(url))) };
}

function resolvedPath(file) {
    try {
        return realpathSync(file);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        const parent = path.dirname(file);

        if (parent === file) {
            throw error;
        }

        return path.join(resolvedPath(parent), path.basename(file));
    }
}

function contains(parent, file) {
    const relative = path.relative(parent, file);

    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function assertOutputOwnership(input, output, projectRoot) {
    const source = resolvedPath(input);
    const destination = resolvedPath(output);
    const project = resolvedPath(projectRoot);
    const protectedPaths = ['src', 'config', '.git', '.github', 'dist', 'node_modules'].map(name => resolvedPath(path.join(project, name)));

    if (contains(destination, source) || contains(source, destination) || contains(destination, project)
        || protectedPaths.some(file => contains(file, destination) || contains(destination, file))) {
        throw new Error('Coverage output overlaps input or protected project paths');
    }
    let info;

    try {
        info = lstatSync(output);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return;
        }
        throw error;
    }

    if (!info.isDirectory() || info.isSymbolicLink()) {
        throw new Error('Coverage output must be a real report directory');
    }

    for (const entry of readdirSync(output, { withFileTypes: true })) {
        let report;

        if (entry.isFile() && entry.name.endsWith('.json')) {
            try {
                report = JSON.parse(readFileSync(path.join(output, entry.name), 'utf8'));
            } catch {
                // Malformed files cannot establish ownership of this directory.
            }
        }

        if (!Array.isArray(report?.result)) {
            throw new Error(`Coverage output contains unrelated content: ${entry.name}`);
        }
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const projectRoot = fileURLToPath(new URL('..', import.meta.url));
    const input = path.resolve(process.argv[2] ?? '.coverage');
    const output = path.resolve(process.argv[3] ?? '.coverage-source');

    if (input === output) {
        throw new Error('Coverage input and output must differ');
    }
    assertOutputOwnership(input, output, projectRoot);
    rmSync(output, { recursive: true, force: true });
    mkdirSync(output, { recursive: true });
    for (const name of readdirSync(input)) {
        if (name.endsWith('.json')) {
            const report = JSON.parse(readFileSync(path.join(input, name), 'utf8'));

            writeFileSync(path.join(output, name), JSON.stringify(selectCoverageScripts(report, projectRoot)));
        }
    }
}
