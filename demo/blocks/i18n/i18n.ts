/** Select a complete keyset; browser and build use the same translations. */
export function keyset<T>(translations: { ru: T; en: T }, language?: string): T {
    const locale = language === 'ru' ? 'ru' : 'en';

    return translations[locale];
}
