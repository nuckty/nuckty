/** Generic document data prepared by the engine for a consumer renderer. */
import type { BEMTree } from '../bem/types.js';
import type { SitemapArtifact, SitemapPage, BundleHashEntry } from '../stages/types.js';
import type { Alternates, Target } from '../targets/config.js';

export interface DocumentAssets {
    css: Record<string, BundleHashEntry>;
    js: Record<string, BundleHashEntry>;
    images: Record<string, string>;
    videos: Record<string, string>;
}

export interface DocumentData {
    page: SitemapPage;
    content: BEMTree;
    sitemap: SitemapArtifact;
    assets: DocumentAssets;
    alternates: Alternates;
    target?: Target;
    lang?: string;
}

export type DocumentHandler = (data: DocumentData) => BEMTree | Promise<BEMTree>;

/** Consumer-owned document entry point. The core only supplies data to it. */
export class DocumentFacade {
    private handler: DocumentHandler | null = null;

    register(handler: DocumentHandler): void {
        if (this.handler) {
            throw new Error('nuckty: a document handler is already registered');
        }

        this.handler = handler;
    }

    async render(data: DocumentData): Promise<BEMTree> {
        if (!this.handler) {
            throw new Error(
                'nuckty: no document handler registered. ' +
                'Register one in the site or load a document extension.',
            );
        }

        return this.handler(data);
    }
}
