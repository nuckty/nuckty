/** Rewrite raw image URLs without changing authored HTML or literal code. */
import { decodeHTMLAttribute } from 'entities/decode';
import { transformImagePathShared, type ImageMappingEnv } from './image-mapping.js';
import { escapeAttr } from '../bem/html/escape.js';

export function postprocessHtml(html: string, imageEnv?: ImageMappingEnv): string {
    if (!imageEnv) {
        return html;
    }

    // Complete tags consume quoted attributes before image lookup. Literal
    // regions consume their contents so image-shaped strings stay untouched.
    const tagEnd = String.raw`(?:"[^"]*"|'[^']*'|[^'">])*?>`;
    const literalElements = '(pre|code|script|style|textarea|title|iframe|xmp|noembed|noframes)';
    const markup = new RegExp([
        String.raw`<!--[\s\S]*?(?:-->|$)`,
        String.raw`<!\[CDATA\[[\s\S]*?(?:\]\]>|$)`,
        String.raw`<plaintext(?=[\t\n\f\r />])${tagEnd}[\s\S]*$`,
        String.raw`<${literalElements}(?=[\t\n\f\r />])${tagEnd}[\s\S]*?(?:<\/\1\s*>|$)`,
        String.raw`<\/?[a-z][a-z\d:._-]*${tagEnd}`,
        String.raw`<!${tagEnd}`,
    ].join('|'), 'gi');
    const attributes = /([\t\n\f\r ]+)([^\t\n\f\r "'<>/=]+)(?:([\t\n\f\r ]*=[\t\n\f\r ]*)(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r >]+)))?/g;

    return html.replace(markup, (tag) => {
        if (!/^<img(?=[\t\n\f\r />])/i.test(tag)) {
            return tag;
        }

        return tag.replace(attributes, (attribute, spacing: string, name: string, assignment: string | undefined,
            doubleQuoted: string | undefined, singleQuoted: string | undefined, unquoted: string | undefined) => {
            const src = doubleQuoted ?? singleQuoted ?? unquoted;

            if (name.toLowerCase() !== 'src' || assignment === undefined || src === undefined) {
                return attribute;
            }
            const logicalSrc = decodeHTMLAttribute(src);
            const transformed = transformImagePathShared(logicalSrc, imageEnv);

            return transformed === logicalSrc ? attribute : `${spacing}${name}${assignment}"${escapeAttr(transformed)}"`;
        });
    });
}

