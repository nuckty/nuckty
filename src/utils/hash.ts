import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Generate an MD5 content hash, 16 hex characters.
 * Accepts a string or a Buffer/Uint8Array.
 */
export function generateHash(content: string | Uint8Array): string {
    const hash = createHash('md5').update(content);
    return hash.digest('hex').substring(0, 16);
}

/** Hash large assets without allocating a buffer the size of the file. */
export async function generateFileHash(file: string): Promise<string> {
    const hash = createHash('md5');

    for await (const chunk of createReadStream(file)) {
        hash.update(chunk);
    }

    return hash.digest('hex').substring(0, 16);
}
