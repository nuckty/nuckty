/**
 * HTML escaping + minimization helpers — single chokepoint for text, attribute
 * values, and the attribute quoting rule.
 *
 * Text nodes use escapeText; attribute values use escapeAttr. Trusted raw HTML
 * bypasses both helpers. Quoting is decided separately by needsQuotes.
 *
 * @module bem/html/escape
 */

/** Text and attribute values share one escape set; quotes are escaped in text too to retain the established serialization. */
const ESCAPE_RE = /[&<>"]/g;
const ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
};

/** Escape text content (`&`/`<`/`>`/`"`). */
export function escapeText(s: string): string {
    return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c]!);
}

/**
 * Attributes carry logical values. Encode once so an HTML parser recovers them
 * without introducing attributes or terminating data-bem JSON. Raw bypasses this.
 */
export function escapeAttr(s: string): string {
    return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c]!);
}

const QUOTE_TRIGGERS_RE = /[\s"'`<>=]/;

/** Empty string and strings containing a trigger char must be quoted. */
export function needsQuotes(value: string): boolean {
    if (value === '') {
        return true;
    }
    return QUOTE_TRIGGERS_RE.test(value);
}

/** HTML syntax folds ASCII letters only, including for boolean attribute names. */
export function normalizeHtmlName(name: string): string {
    return name.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** Supported HTML void tags, including legacy param; emit no end tag or `/>`. */
export const VOID_TAGS: ReadonlySet<string> = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Supported boolean attributes — emitted bare (name only, no `=`). */
export const BOOLEAN_ATTRS: ReadonlySet<string> = new Set([
    'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
    'default', 'defer', 'disabled', 'formnovalidate', 'ismap',
    'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open',
    'playsinline', 'readonly', 'required', 'reversed', 'selected', 'truespeed',
]);
