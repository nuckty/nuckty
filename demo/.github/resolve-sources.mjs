import { appendFile } from 'node:fs/promises';

for (const name of ['nuckty', 'nuckty-docs']) {
    const url = `https://api.github.com/repos/nuckty/${name}/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=1`;
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) {
        throw new Error(`Cannot resolve verified ${name}: HTTP ${response.status}`);
    }
    const { workflow_runs: runs } = await response.json();
    const ref = runs?.[0]?.head_sha;
    if (!/^[a-f0-9]{40}$/.test(ref ?? '')) {
        throw new Error(`No successful main push CI found for ${name}`);
    }
    const key = name === 'nuckty' ? 'NUCKTY_ENGINE_REF' : 'NUCKTY_DOCS_REF';
    await appendFile(process.env.GITHUB_ENV, `${key}=${ref}\n`);
    console.log(`${name}: ${ref}`);
}
