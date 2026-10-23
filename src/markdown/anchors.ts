import { createSlugify, type SlugifyOptions } from './slugify.js';

/** Build a hierarchical anchor from a stack of heading text fragments. */
export function buildHierarchicalAnchor(
    headingStack: string[],
    slugifyOpts: SlugifyOptions = {},
): string {
    const slug = createSlugify(slugifyOpts);

    if (!headingStack || headingStack.length === 0) {
        return '';
    }

    // Slugify each heading; empties are preserved for the double-hyphen effect.
    const parts = headingStack.map((h) => slug(h ?? ''));

    // Drop leading empties so the anchor does not start with `-`.
    let firstNonEmpty = 0;
    while (
        firstNonEmpty < parts.length &&
        (parts[firstNonEmpty] === '' || parts[firstNonEmpty] === undefined)
    ) {
        firstNonEmpty++;
    }

    if (firstNonEmpty >= parts.length) {
        return '';
    }

    return parts.slice(firstNonEmpty).join('-');
}
