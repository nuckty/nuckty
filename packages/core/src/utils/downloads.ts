/** Extensions of downloadable files the assets stage copies to the artifact root and Markdown links resolve. */
export const DOWNLOAD_EXTENSIONS: readonly string[] = ['.pdf', '.zip', '.ini'];

/** Whether a file name has a download extension, ignoring ASCII case. */
export function isDownload(name: string): boolean {
    const lower = name.toLowerCase();

    return DOWNLOAD_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
