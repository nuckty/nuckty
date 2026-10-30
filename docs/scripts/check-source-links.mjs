import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['.git', 'node_modules', 'plans']);
const excludedFiles = new Set(['AGENTS.md', 'CLAUDE.md', 'report.md']);
const markdownLink = /\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g;
const issues = [];
let filesChecked = 0;
let linksChecked = 0;

async function collectMarkdown(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!ignored.has(entry.name)) {
                files.push(...await collectMarkdown(path.join(directory, entry.name)));
            }
        } else if (entry.isFile() && entry.name.endsWith('.md') && !excludedFiles.has(entry.name)) {
            files.push(path.join(directory, entry.name));
        }
    }
    return files;
}

function sourceSegments(markdown) {
    const lines = markdown.match(/.*(?:\n|$)/g) ?? [];
    const segments = [];
    let prose = [];
    let fenceChar = null;
    let fenceLength = 0;
    for (const line of lines) {
        if (fenceChar === null) {
            const opening = line.match(/^ {0,3}(`{3,}|~{3,})/);
            if (opening) {
                if (prose.length > 0) {
                    segments.push(prose.join(''));
                }
                prose = [];
                fenceChar = opening[1][0];
                fenceLength = opening[1].length;
            } else {
                prose.push(line);
            }
        } else {
            const closing = line.replace(/\r?\n$/, '').match(/^ {0,3}([`~]+)[ \t]*$/);
            if (closing && closing[1][0] === fenceChar && closing[1].length >= fenceLength) {
                fenceChar = null;
                fenceLength = 0;
            }
        }
    }
    if (prose.length > 0) {
        segments.push(prose.join(''));
    }
    return segments;
}

function maskInlineCode(text) {
    const masked = text.split('');
    let cursor = 0;
    while (cursor < text.length) {
        if (text[cursor] !== '`') {
            cursor += 1;
            continue;
        }
        let runEnd = cursor + 1;
        while (text[runEnd] === '`') {
            runEnd += 1;
        }
        const run = '`'.repeat(runEnd - cursor);
        const closingRun = new RegExp('(?<!`)' + run + '(?!`)', 'g');
        closingRun.lastIndex = runEnd;
        const closing = closingRun.exec(text);
        if (!closing) {
            cursor = runEnd;
            continue;
        }
        for (let i = cursor; i < closingRun.lastIndex; i += 1) {
            if (masked[i] !== '\n' && masked[i] !== '\r') {
                masked[i] = ' ';
            }
        }
        cursor = closingRun.lastIndex;
    }
    return masked.join('');
}

async function checkFile(file) {
    const markdown = await readFile(file, 'utf8');
    filesChecked += 1;
    const relativeFile = path.relative(root, file);
    for (const prose of sourceSegments(markdown)) {
        const plain = maskInlineCode(prose);
        markdownLink.lastIndex = 0;
        for (const match of plain.matchAll(markdownLink)) {
            const destination = match[1] ?? match[2];
            if (destination.startsWith('/') && !destination.startsWith('//')) {
                issues.push(`${relativeFile}: root-relative documentation link remains: ${destination}`);
                continue;
            }
            if (/^[a-z][a-z\d+.-]*:/i.test(destination) || destination.startsWith('#')) {
                continue;
            }
            const sourcePath = destination.split(/[?#]/, 1)[0];
            if (!/\.md$/i.test(sourcePath)) {
                continue;
            }
            let decodedPath;
            try {
                decodedPath = decodeURIComponent(sourcePath);
            } catch {
                issues.push(`${relativeFile}: malformed percent-encoding in ${destination}`);
                continue;
            }
            const target = path.resolve(path.dirname(file), decodedPath);
            const relativeTarget = path.relative(root, target);
            if (relativeTarget.startsWith(`..${path.sep}`) || relativeTarget === '..' || path.isAbsolute(relativeTarget)) {
                issues.push(`${relativeFile}: source link escapes the docs repository: ${destination}`);
                continue;
            }
            try {
                if (!(await stat(target)).isFile()) {
                    throw new Error('not a file');
                }
                linksChecked += 1;
            } catch {
                issues.push(`${relativeFile}: Markdown source target does not exist: ${destination}`);
            }
        }
    }
}

for (const file of await collectMarkdown(root)) {
    await checkFile(file);
}

if (issues.length > 0) {
    process.stderr.write(`${issues.join('\n')}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write(`Checked ${linksChecked} local Markdown links in ${filesChecked} source files.\n`);
}
