/** Move the latest dist-tag of every public workspace package to one already published version. */
import { readdirSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const registry = 'https://registry.npmjs.org';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export class RegistryError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/** Names of the public packages under packages/. */
export function publicPackages(root) {
    return readdirSync(path.join(root, 'packages'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => JSON.parse(readFileSync(path.join(root, 'packages', entry.name, 'package.json'), 'utf8')))
        .filter((manifest) => !manifest.private)
        .map((manifest) => manifest.name)
        .sort();
}

/** Read registry JSON; 429 and 5xx are retried within the deadline, honoring Retry-After; other failures are final. */
export async function readJson(url, { request = fetch, sleep, now = Date.now, deadline }) {
    for (;;) {
        const response = await request(url, { headers: { accept: 'application/json', 'cache-control': 'no-cache' } });

        if (response.ok) {
            return response.json();
        }
        if (response.status !== 429 && response.status < 500) {
            throw new RegistryError(`${url}: registry returned ${response.status}`, response.status);
        }
        const retryAfter = Number(response.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 10000;

        if (now() + wait > deadline) {
            throw new RegistryError(`${url}: registry returned ${response.status} until the verification deadline`, response.status);
        }
        await sleep(wait);
    }
}

/** Promote `version` to latest for `packages`: verify every version first, write only latest, then read all tags back. */
export async function promoteLatest({ version, packages, request = fetch, run, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = Date.now, budget = 10 * 60 * 1000, log = console.log }) {
    if (typeof version !== 'string' || !VERSION.test(version)) {
        throw new Error('Expected an exact semantic version without build metadata');
    }
    const deadline = now() + budget;
    const options = { request, sleep, now, deadline };
    const before = new Map();

    for (const name of packages) {
        const document = await readJson(`${registry}/${encodeURIComponent(name)}`, options);

        if (!document.versions?.[version]) {
            throw new Error(`${name}@${version} is not published`);
        }
        before.set(name, { ...document['dist-tags'] });
    }
    for (const name of packages) {
        if (before.get(name).latest === version) {
            log(`${name}: latest already ${version}`);
            continue;
        }
        await run('npm', ['dist-tag', 'add', `${name}@${version}`, 'latest', `--registry=${registry}`]);
        log(`${name}: latest -> ${version}`);
    }

    const pending = new Set(packages);

    for (;;) {
        for (const name of pending) {
            const tags = await readJson(`${registry}/-/package/${encodeURIComponent(name)}/dist-tags`, options);
            const expected = { ...before.get(name), latest: version };
            const changed = Object.keys({ ...expected, ...tags }).filter((tag) => tags[tag] !== expected[tag]);

            if (changed.length === 0) {
                pending.delete(name);
                log(`${name}: ${JSON.stringify(tags)}`);
            } else if (changed.some((tag) => tag !== 'latest')) {
                throw new Error(`${name}: dist-tags other than latest changed: ${JSON.stringify(tags)}`);
            }
        }
        if (pending.size === 0) {
            return;
        }
        if (now() + 10000 > deadline) {
            throw new Error(`latest did not read back as ${version} for ${[...pending].join(', ')}`);
        }
        await sleep(10000);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const execFileAsync = promisify(execFile);

    await promoteLatest({
        version: process.env.PROMOTE_VERSION,
        packages: publicPackages(path.resolve(import.meta.dirname, '..')),
        run: async (command, args) => {
            const { stdout, stderr } = await execFileAsync(command, args, { encoding: 'utf8' });
            process.stdout.write(stdout);
            process.stderr.write(stderr);
        },
    });
}
