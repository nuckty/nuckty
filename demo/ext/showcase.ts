import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createMarkdown, type BEMTree, type BemNode, type MarkdownOptions, type NucktyEnv } from 'nuckty';

const samples = new Set(['basics', 'gfm', 'gallery', 'grid', 'typography']);

export function register(env: NucktyEnv): void {
    env.pipeline.before('manifest', async (ctx) => {
        const files: Record<string, { size: number; hash: string }> = {};

        async function collect(directory: string, prefix = ''): Promise<void> {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const name = path.posix.join(prefix, entry.name);

                if (entry.isDirectory()) {
                    await collect(path.join(directory, entry.name), name);
                } else if (entry.isFile() && name !== 'manifest.json' && name !== 'build-files.txt') {
                    const bytes = await readFile(path.join(directory, entry.name));
                    files[name] = { size: bytes.length, hash: createHash('md5').update(bytes).digest('hex').slice(0, 16) };
                }
            }
        }

        await collect(ctx.outDir);
        await writeFile(path.join(ctx.outDir, 'build-files.txt'), JSON.stringify(files, null, 2));
    });
    function language(bridge: unknown): string {
        return (bridge as MarkdownOptions).sourceFile?.endsWith('.en.md') ? 'en' : 'ru';
    }

    function localize(tree: BEMTree, lang: string): void {
        if (Array.isArray(tree)) {
            tree.forEach((child) => localize(child, lang));
        } else if (tree && typeof tree === 'object' && !('raw' in tree)) {
            tree.props = { ...tree.props, lang };
            localize(tree.content, lang);
        }
    }

    function sampleNode(sample: string, bridge: unknown): BemNode {
        const lang = language(bridge);
        const suffix = lang === 'en' ? '.en' : '';
        const source = readFileSync(new URL(`../content/examples/${sample}${suffix}.md`, import.meta.url), 'utf8');
        const options = bridge as MarkdownOptions;
        const { tree } = createMarkdown({
            ...options,
            sourceFile: `examples/${sample}${suffix}.md`,
            remarkPlugins: env.markdown.list(),
            directiveMappings: env.markdown.directiveMappings(),
        }).render(source);

        localize(tree, lang);

        return { block: 'example', props: { sample, source, lang }, content: tree };
    }

    env.markdown.directive('showcase', (_node, bridge) => ({
        block: 'showcase',
        props: { lang: language(bridge), gallery: sampleNode('gallery', bridge), grid: sampleNode('grid', bridge) },
    }));
    env.markdown.directive('playground', (_node, bridge) => ({ block: 'playground', props: { lang: language(bridge) } }));
    env.markdown.directive('example', (node, bridge) => {
        const sample = node.attributes?.['sample'];

        if (!sample || !samples.has(sample)) {
            throw new Error(`Unknown showcase sample: ${sample}`);
        }

        return { ...sampleNode(sample, bridge) };
    });
}
