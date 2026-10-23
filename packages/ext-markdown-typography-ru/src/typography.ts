export function applyRussianTypography(text: string): string {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // Horizontal normalization must not consume line breaks or dialogue indentation.
    return text.replace(/([^\s])([ \t\u00a0]*)—([ \t\u00a0]*)/g,
        (match: string, previous: string, before: string, after: string, offset: number) => {
            const next = text[offset + match.length] ?? '';
            if (before === '' && after === '' && !(/[a-zа-яё]/i.test(previous) && /[a-zа-яё]/i.test(next))) {
                return match;
            }

            return `${previous}\u00a0— `;
        });
}

