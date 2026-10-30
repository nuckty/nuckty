/**
 * Video embed remark plugin — turns `@[provider](id)` into `video` mdast nodes.
 *
 * remark parses `@[youtube](bsgLJcQz43s)` as a text node ending in `@` followed
 * by a link whose only child is the provider name and whose `url` is the video
 * id. The plugin drops the `@`, replaces the link with a block-level `video`
 * node and splits the surrounding paragraph so prose stays in paragraphs. The
 * extension's node handler maps `video` nodes to the `video` block.
 *
 * Providers: `youtube`, `rutube` and `vk`. An unknown provider is left
 * untouched (the `@` and the link render as ordinary text and link).
 *
 * @module video-plugin
 */

import type { Plugin, Root } from '@nuckty/core';
import type { Paragraph, Link, PhrasingContent, RootContent } from 'mdast';

export interface VideoProvider {
    /** Matches the link's only-text-child (lowercased) and the provider name. */
    name: string;
    /** Display name used in the frame title, e.g. `YouTube`. */
    label: string;
    /** Builds the iframe `src` from the video id (the link's `url`). */
    src: (id: string) => string;
}

/** The default providers: YouTube, RuTube, VK. */
export const DEFAULT_VIDEO_PROVIDERS: VideoProvider[] = [
    { name: 'youtube', label: 'YouTube', src: (id) => `https://www.youtube.com/embed/${id}` },
    { name: 'rutube', label: 'RUTUBE', src: (id) => `https://rutube.ru/play/embed/${id}` },
    { name: 'vk', label: 'VK Video', src: (id) => {
        if (/^https:\/\/(?:vk\.com|vk\.ru|vkvideo\.ru)\/video_ext\.php\?/.test(id)) {
            return id;
        }
        const match = /^(-?\d+)_(\d+)$/.exec(id);

        if (!match) {
            throw new Error('VK video requires owner_id_video_id or a full video_ext.php embed URL');
        }

        return `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}`;
    } },
];

/** The mdast node the plugin inserts for one embed. */
export interface VideoNode {
    type: 'video';
    /** Provider display name, e.g. `YouTube`. */
    provider: string;
    /** Embed URL built by the provider. */
    src: string;
}

/** Find a provider by its lowercase name (link's only-text-child), or null. */
function findProvider(name: string, providers: VideoProvider[]): VideoProvider | null {
    const lower = name.toLowerCase();
    return providers.find((p) => p.name.toLowerCase() === lower) ?? null;
}

/**
 * Create the remark plugin with a provider list. Each paragraph holding
 * `text ending in '@'` + `link(provider)` pairs is split into paragraphs and
 * `video` nodes at the same level.
 */
export function createVideoPlugin(providers: VideoProvider[] = DEFAULT_VIDEO_PROVIDERS): Plugin<[], Root> {
    return () => (tree: Root) => {
        const walk = (parent: { children: RootContent[] }): void => {
            parent.children = parent.children.flatMap((child): RootContent[] => {
                if (child.type === 'paragraph') {
                    return splitParagraph(child, providers);
                }
                if ('children' in child && Array.isArray(child.children)) {
                    walk(child as { children: RootContent[] });
                }

                return [child];
            });
        };
        walk(tree);
    };
}

/** Split a paragraph at its embeds; whitespace-only prose between embeds is dropped. */
function splitParagraph(paragraph: Paragraph, providers: VideoProvider[]): RootContent[] {
    const out: RootContent[] = [];
    let prose: PhrasingContent[] = [];
    const flush = (): void => {
        if (prose.some((node) => node.type !== 'text' || node.value.trim() !== '')) {
            out.push({ ...paragraph, children: prose });
        }
        prose = [];
    };
    const kids = paragraph.children;

    for (let i = 0; i < kids.length; i++) {
        const current = kids[i]!;
        const next = kids[i + 1];
        const embed = current.type === 'text' && next?.type === 'link' ? matchEmbed(current.value, next, providers) : null;

        if (!embed) {
            prose.push(current);
            continue;
        }
        if (embed.beforeText !== '') {
            prose.push({ type: 'text', value: embed.beforeText });
        }
        flush();
        out.push(embed.video as unknown as RootContent);
        i++;
    }
    flush();

    return out.length > 0 ? out : [paragraph];
}

/** Match a `text('…@')` + `link(provider)` pair, or return null. */
function matchEmbed(text: string, link: Link, providers: VideoProvider[]): { video: VideoNode; beforeText: string } | null {
    const match = text.match(/^(.*)@$/s);
    const only = link.children.length === 1 ? link.children[0] : undefined;

    if (!match || only?.type !== 'text' || !link.url) {
        return null;
    }
    const provider = findProvider(only.value, providers);

    return provider ? { video: { type: 'video', provider: provider.label, src: provider.src(link.url) }, beforeText: match[1] ?? '' } : null;
}

/** Default plugin with the default providers. */
export const remarkVideoEmbed: Plugin<[], Root> = createVideoPlugin();
