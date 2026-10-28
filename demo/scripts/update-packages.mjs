/** Resolve a compatible official npm release set before changing consumer inputs. */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const packages = [
    '@nuckty/core',
    '@nuckty/ext-block-gallery',
    '@nuckty/ext-block-grid',
    '@nuckty/ext-block-root',
    '@nuckty/ext-command-content-external',
    '@nuckty/ext-command-convert-images',
    '@nuckty/ext-command-deploy-ftp',
    '@nuckty/ext-command-serve',
    '@nuckty/ext-command-validate-vnu',
    '@nuckty/ext-markdown-typography-ru',
    '@nuckty/ext-markdown-video'
];
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export async function selectVersions(current, channel, request = fetch) {
    if (!['beta', 'latest'].includes(channel) || Object.keys(current).some((name) => !packages.includes(name))) {
        throw new Error('Only official package names and beta/latest release channels are supported');
    }

    const selected = {};

    for (const name of Object.keys(current)) {
        const response = await request(`https://registry.npmjs.org/${encodeURIComponent(name)}/${channel}`);

        if (!response.ok) {
            throw new Error(`Published ${channel} metadata is unavailable for ${name}`);
        }

        const metadata = await response.json();

        if (metadata.name !== name || typeof metadata.version !== 'string' || !exactVersion.test(metadata.version) || !metadata.dist?.tarball?.startsWith('https://registry.npmjs.org/') || !metadata.dist?.integrity?.startsWith('sha512-')) {
            throw new Error(`Invalid public registry release for ${name}`);
        }

        selected[name] = metadata.version;
    }

    return selected;
}

export function updateDependencies(manifest, versions) {
    const updated = structuredClone(manifest);

    for (const section of ['dependencies', 'devDependencies']) {
        for (const name of Object.keys(updated[section] ?? {})) {
            if (name.startsWith('@nuckty/')) {
                if (!packages.includes(name) || !versions[name]) {
                    throw new Error(`Unknown official dependency ${name}`);
                }

                updated[section][name] = versions[name];
            }
        }
    }

    return updated;
}

export async function updatePackages(root, channel, request = fetch, install = execFileSync) {
    const versionsFile = path.join(root, 'config/config-packages.json');
    const current = JSON.parse(readFileSync(versionsFile, 'utf8'));

    if (packages.length !== Object.keys(current).length || packages.some((name) => !Object.hasOwn(current, name))) {
        throw new Error('The complete official release allowlist is required');
    }

    const versions = await selectVersions(current, channel, request);

    if (JSON.stringify(versions) === JSON.stringify(current)) {
        return;
    }

    const temporary = mkdtempSync(path.join(tmpdir(), 'nuckty-release-peers-'));

    try {
        writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ private: true, dependencies: versions }));
        install('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--strict-peer-deps'], { cwd: temporary, stdio: 'pipe' });
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }

    const manifestFile = path.join(root, 'package.json');
    const manifest = updateDependencies(JSON.parse(readFileSync(manifestFile, 'utf8')), versions);
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 4)}\n`);
    writeFileSync(versionsFile, `${JSON.stringify(versions, null, 4)}\n`);
    install('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--strict-peer-deps'], { cwd: root, stdio: 'pipe' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    await updatePackages(path.resolve(import.meta.dirname, '..'), process.argv[2]);
}
