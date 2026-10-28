export interface SlugifyOptions {
    /** Case transform applied before stripping. Default `'lower'`. */
    case?: 'lower' | 'upper' | 'none';
    /** Separator inserted in place of whitespace/slashes. Default `'-'`. */
    separator?: string;
}

/** Create a slugify function with the given options. */
export function createSlugify(opts: SlugifyOptions = {}): (text: string) => string {
    const caseType = opts.case ?? 'lower';
    const separator = opts.separator ?? '-';

    // Escape the separator for safe use in regexes.
    const escSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classSeparator = escSep.replace(/-/g, '\\-');

    return function slugify(text: string): string {
        // Case transform.
        if (caseType === 'lower') {
            text = text.toLowerCase();
        } else if (caseType === 'upper') {
            text = text.toUpperCase();
        }

        // Strip HTML tags.
        text = text.replace(/<[^>]+>/g, '');

        // Remove trailing dots from numbered headings ("1. Text" -> "1 Text").
        if (/^\d+\.\s/.test(text)) {
            text = text.replace(/^(\d+)\.\s/, '$1 ');
        }

        // Slashes → separator first.
        text = text.replace(/[/\\]+/g, () => separator);

        // Whitespace/underscores → separator.
        text = text.replace(/[\s_]+/g, () => separator);

        // Keep Latin, Cyrillic, digits, dots, separator; drop the rest.
        const keep = new RegExp(`[^a-zA-Z0-9\\u0400-\\u04FF\\.${classSeparator}]+`, 'gu');
        text = text.replace(keep, '');

        // Trim leading/trailing separators.
        if (separator !== '') {
            text = text.replace(new RegExp(`^(?:${escSep})+|(?:${escSep})+$`, 'gu'), '');
            text = text.replace(new RegExp(`(?:${escSep})+`, 'gu'), () => separator);
        }

        return text;
    };
}

/** Default slugify (lowercase, hyphen). */
export const slugify = createSlugify();

export function createGitHubSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\sЀ-ӿ-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
}

export function createGitHubSlugify(opts: SlugifyOptions = {}): (text: string) => string {
    const caseType = opts.case ?? 'lower';
    const separator = opts.separator ?? '-';
    const escSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const classSeparator = escSep.replace(/-/g, '\\-');

    return function githubSlugify(text: string): string {
        if (caseType === 'lower') {
            text = text.toLowerCase();
        } else if (caseType === 'upper') {
            text = text.toUpperCase();
        }
        text = text.replace(/<[^>]+>/g, '');
        if (/^\d+\.\s/.test(text)) {
            text = text.replace(/^(\d+)\.\s/, '$1 ');
        }
        // GitHub removes slashes completely (no separator inserted).
        text = text.replace(/[/\\]+/g, '');
        text = text.replace(/[\s_]+/g, () => separator);
        const keep = new RegExp(`[^a-zA-Z0-9\\u0400-\\u04FF\\.${classSeparator}]+`, 'gu');
        text = text.replace(keep, '');

        if (separator !== '') {
            text = text.replace(new RegExp(`^(?:${escSep})+|(?:${escSep})+$`, 'gu'), '');
            text = text.replace(new RegExp(`(?:${escSep})+`, 'gu'), () => separator);
        }

        return text;
    };
}

/** Clean heading text: strip HTML tags and numbered prefixes like "1.2.3. ". */
export function cleanHeadingText(text: string): string {
    let clean = text.replace(/<[^>]+>/g, '');
    // Remove numbered prefixes at the very start (preserve version-like "2.4.3"
    // when not followed by ". " and then text).
    clean = clean.replace(/^\d+(?:\.\d+)*\.\s+(?=\S)/, '').trim();
    return clean.trim();
}
