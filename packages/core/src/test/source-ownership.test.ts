import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { runBuild } from './helpers/build.js';

async function write(root: string, file: string, value: string): Promise<void> {
    const destination = path.join(root, file);

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value);
}

async function fixture(t: TestContext, bundle?: string): Promise<string> {
    const cwd = await mkdtemp(path.join(tmpdir(), 'nuckty-input-ownership-'));

    t.after(() => rm(cwd, { recursive: true, force: true }));
    t.mock.method(process.stdout, 'write', () => true);
    await write(cwd, 'package.json', '{"type":"module"}');
    await write(cwd, 'config/config-nuckty.ts', "export default {targets:{main:{configDir:'config',outDir:'site'}},ext:['./document.mjs']};");
    await write(cwd, 'document.mjs', "export function register(env){env.document.register(data=>({tag:'html',content:[{tag:'head',content:{tag:'title',content:'Fixture'}},{tag:'body',content:data.content}]}));}");
    await write(cwd, 'config/site.json', JSON.stringify({ bundles: bundle ? [bundle] : [] }));
    await write(cwd, 'config/sitemap.yml', 'sitemap:\n  - Home [/, link.md]\n');
    await write(cwd, 'content/link.md', '# Allowed');

    return cwd;
}

for (const bundle of ['normal', '__proto__', 'constructor']) {
    test(`bundle ${bundle} retains CSS/JS dependencies as own keys`, async (t) => {
        const cwd = await fixture(t, bundle);

        await write(cwd, 'blocks/package.json', '{"type":"commonjs"}');
        await write(cwd, `blocks/${bundle}/${bundle}.bemdecl.js`, "module.exports=['widget'];");
        await write(cwd, 'blocks/widget/widget.css', '.widget{color:red}');
        await write(cwd, 'blocks/widget/widget.js', 'globalThis.reviewWidget=1;');
        await runBuild({ cwd, command: 'build' });

        for (const [kind, marker] of [['css', 'color:red'], ['js', 'reviewWidget']] as const) {
            const files = await readdir(path.join(cwd, 'site', kind));

            assert.equal(files.length, 1);
            assert.match(await readFile(path.join(cwd, 'site', kind, files[0]!), 'utf8'), new RegExp(marker));
        }
    });
}

test('Markdown source symlink cannot publish outside-root bytes', async (t) => {
    const cwd = await fixture(t);

    await rm(path.join(cwd, 'content/link.md'));
    await write(cwd, 'outside.md', '# OUTSIDE_SYNTHETIC_SENTINEL');
    await symlink(path.join(cwd, 'outside.md'), path.join(cwd, 'content/link.md'));
    await assert.rejects(runBuild({ cwd, command: 'build' }), /source.*escapes content directory/i);
    await assert.rejects(access(path.join(cwd, 'site/html/index.html')), { code: 'ENOENT' });
});

for (const symbolicRoot of [false, true]) {
    test(`inside-root source alias remains supported (symbolic root=${symbolicRoot})`, async (t) => {
        const cwd = await fixture(t);
        const content = symbolicRoot ? 'real content' : 'content';

        await write(cwd, `${content}/actual.md`, '# Allowed alias');
        await rm(path.join(cwd, 'content/link.md'));

        if (symbolicRoot) {
            await rm(path.join(cwd, 'content'), { recursive: true });
            await symlink(path.join(cwd, content), path.join(cwd, 'content'));
        }
        await symlink(path.join(cwd, content, 'actual.md'), path.join(cwd, 'content/link.md'));
        await runBuild({ cwd, command: 'build' });

        const html = await readFile(path.join(cwd, 'site/html/index.html'), 'utf8');

        assert.ok(html.includes('Allowed alias'));
    });
}

