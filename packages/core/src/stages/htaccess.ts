import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';

export function generateHtaccess(): string {
    return `DirectoryIndex index.html

# The site's own /404 page answers missing routes, as in the nginx configuration
ErrorDocument 404 /404

RewriteEngine On

# Block direct codec URLs, allowing internal negotiation and error documents.
# Match the decoded, normalized path so encoded and dot-segment forms are covered.
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule ^(brotli|gzip)(/|$) - [R=404,L,NC]

# Block direct access to .html files with 404
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule \\.html$ - [R=404,L,NC]

# The deployment manifest is read over FTP, not served to visitors.
# Match the decoded, normalized path so encoded and dot-segment forms are covered.
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule ^manifest\\.json$ - [R=404,L,NC]

RewriteCond %{REQUEST_URI} ^(.+)/$
RewriteRule ^(.+)/$ /$1 [R=301,L]

# Artifact directories are storage, not pages: no listings, index files or slash redirects.
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^. - [R=404,L]

# Hash-prefixed images (_i*) with AVIF support - highest priority
RewriteCond %{HTTP:Accept} "(?:^|,)[ ]*image/avif[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/avif/$1.avif -f
RewriteRule ^_i([a-f0-9]+)$ avif/$1.avif [L,E=IS_IMAGE:1]

# Hash-prefixed images (_i*) with WebP support - second priority
RewriteCond %{HTTP:Accept} "(?:^|,)[ ]*image/webp[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/webp/$1.webp -f
RewriteRule ^_i([a-f0-9]+)$ webp/$1.webp [L,E=IS_IMAGE:1]

# Hash-prefixed images (_i*) fallback to PNG
RewriteCond %{DOCUMENT_ROOT}/png/$1.png -f
RewriteRule ^_i([a-f0-9]+)$ png/$1.png [L,E=IS_IMAGE:1]

# Hash-prefixed images (_i*) fallback to JPG
RewriteCond %{DOCUMENT_ROOT}/jpg/$1.jpg -f
RewriteRule ^_i([a-f0-9]+)$ jpg/$1.jpg [L,E=IS_IMAGE:1]

# JPEG and GIF originals retain their stored extension.
RewriteCond %{DOCUMENT_ROOT}/jpg/$1.jpeg -f
RewriteRule ^_i([a-f0-9]+)$ jpg/$1.jpeg [L,E=IS_IMAGE:1]

RewriteCond %{DOCUMENT_ROOT}/$1.gif -f
RewriteRule ^_i([a-f0-9]+)$ $1.gif [L,E=IS_IMAGE:1]

# Hash-prefixed images (_i*) fallback to SVG
RewriteCond %{DOCUMENT_ROOT}/svg/$1.svg -f
RewriteRule ^_i([a-f0-9]+)$ svg/$1.svg [L,E=IS_IMAGE:1]

# A WebP original has no PNG/JPEG fallback and must work without Accept.
RewriteCond %{DOCUMENT_ROOT}/webp/$1.webp -f
RewriteRule ^_i([a-f0-9]+)$ webp/$1.webp [L,E=IS_IMAGE:1]

# Static files with Brotli (CSS, JS, SVG, XML) - highest priority
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/%{REQUEST_URI}.br -f
RewriteRule ^(.+\\.(css|js|svg|xml))$ brotli/$1.br [L,E=COMPRESSION:br]

# Static files with Gzip (CSS, JS, SVG, XML) - fallback
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/%{REQUEST_URI}.gz -f
RewriteRule ^(.+\\.(css|js|svg|xml))$ gzip/$1.gz [L,E=COMPRESSION:gzip]

# Public text files use flat compressed copies; missing files still follow page routing.
RewriteCond %{REQUEST_FILENAME} -f
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1.br -f
RewriteRule ^(?:.*/)?([^/]+\\.txt)$ brotli/$1.br [L,E=COMPRESSION:br]

RewriteCond %{REQUEST_FILENAME} -f
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1.gz -f
RewriteRule ^(?:.*/)?([^/]+\\.txt)$ gzip/$1.gz [L,E=COMPRESSION:gzip]

# Sitemap.xml specific handling (in xml/ directory)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/sitemap.xml.br -f
RewriteRule ^sitemap\\.xml$ brotli/sitemap.xml.br [L,E=COMPRESSION:br]

RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/sitemap.xml.gz -f
RewriteRule ^sitemap\\.xml$ gzip/sitemap.xml.gz [L,E=COMPRESSION:gzip]

RewriteCond %{DOCUMENT_ROOT}/xml/sitemap.xml -f
RewriteRule ^sitemap\\.xml$ xml/sitemap.xml [L,E=COMPRESSION:none]

# Identity CSS representation in the artifact directory.
RewriteCond %{DOCUMENT_ROOT}/css/$1 -f
RewriteRule ^([^/]+\\.css)$ css/$1 [L]

# Identity JS representation in the artifact directory.
RewriteCond %{DOCUMENT_ROOT}/js/$1 -f
RewriteRule ^([^/]+\\.js)$ js/$1 [L]

# Identity SVG representation in the artifact directory.
RewriteCond %{DOCUMENT_ROOT}/svg/$1 -f
RewriteRule ^([^/]+\\.svg)$ svg/$1 [L]

# Identity XML representation in the artifact directory.
RewriteCond %{DOCUMENT_ROOT}/xml/$1 -f
RewriteRule ^([^/]+\\.xml)$ xml/$1 [L]

# Existing public files (including robots.txt) need no page rewrite.
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Root URL with Brotli support
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/index.html.br -f
RewriteRule ^$ brotli/index.html.br [L,E=IS_HTML:1]

# Root URL with Gzip support
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/index.html.gz -f
RewriteRule ^$ gzip/index.html.gz [L,E=IS_HTML:1]

# Root URL (uncompressed lives in html/)
RewriteCond %{DOCUMENT_ROOT}/html/index.html -f
RewriteRule ^$ html/index.html [L,E=IS_HTML:1]

# Single-level: /free -> free.html (Brotli)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1.html.br -f
RewriteRule ^([^/]+)$ brotli/$1.html.br [L,E=IS_HTML:1]

# Single-level: /free -> free.html (Gzip)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1.html.gz -f
RewriteRule ^([^/]+)$ gzip/$1.html.gz [L,E=IS_HTML:1]

# Single-level: /free -> html/free.html
RewriteCond %{DOCUMENT_ROOT}/html/$1.html -f
RewriteRule ^([^/]+)$ html/$1.html [L,E=IS_HTML:1]

# Two-level: /free/models -> free_models.html (Brotli)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1_$2.html.br -f
RewriteRule ^([^/]+)/([^/]+)$ brotli/$1_$2.html.br [L,E=IS_HTML:1]

# Two-level: /free/models -> free_models.html (Gzip)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1_$2.html.gz -f
RewriteRule ^([^/]+)/([^/]+)$ gzip/$1_$2.html.gz [L,E=IS_HTML:1]

# Two-level: /free/models -> html/free_models.html
RewriteCond %{DOCUMENT_ROOT}/html/$1_$2.html -f
RewriteRule ^([^/]+)/([^/]+)$ html/$1_$2.html [L,E=IS_HTML:1]

# Three-level: /a/b/c -> a_b_c.html (Brotli)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1_$2_$3.html.br -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)$ brotli/$1_$2_$3.html.br [L,E=IS_HTML:1]

# Three-level: /a/b/c -> a_b_c.html (Gzip)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1_$2_$3.html.gz -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)$ gzip/$1_$2_$3.html.gz [L,E=IS_HTML:1]

# Three-level: /a/b/c -> html/a_b_c.html
RewriteCond %{DOCUMENT_ROOT}/html/$1_$2_$3.html -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)$ html/$1_$2_$3.html [L,E=IS_HTML:1]

# Four-level: /a/b/c/d -> a_b_c_d.html (Brotli)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1_$2_$3_$4.html.br -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)$ brotli/$1_$2_$3_$4.html.br [L,E=IS_HTML:1]

# Four-level: /a/b/c/d -> a_b_c_d.html (Gzip)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1_$2_$3_$4.html.gz -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)$ gzip/$1_$2_$3_$4.html.gz [L,E=IS_HTML:1]

# Four-level: /a/b/c/d -> html/a_b_c_d.html
RewriteCond %{DOCUMENT_ROOT}/html/$1_$2_$3_$4.html -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)$ html/$1_$2_$3_$4.html [L,E=IS_HTML:1]

# Five-level: /a/b/c/d/e -> a_b_c_d_e.html (Brotli)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/brotli/$1_$2_$3_$4_$5.html.br -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)$ brotli/$1_$2_$3_$4_$5.html.br [L,E=IS_HTML:1]

# Five-level: /a/b/c/d/e -> a_b_c_d_e.html (Gzip)
RewriteCond %{HTTP:Accept-Encoding} "(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" [NC]
RewriteCond %{DOCUMENT_ROOT}/gzip/$1_$2_$3_$4_$5.html.gz -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)$ gzip/$1_$2_$3_$4_$5.html.gz [L,E=IS_HTML:1]

# Five-level: /a/b/c/d/e -> html/a_b_c_d_e.html
RewriteCond %{DOCUMENT_ROOT}/html/$1_$2_$3_$4_$5.html -f
RewriteRule ^([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)$ html/$1_$2_$3_$4_$5.html [L,E=IS_HTML:1]

# Identity responses participate in the same encoding negotiation.
<FilesMatch "\\.(html|css|js|svg|xml|txt)(\\.br|\\.gz)?$">
    Header always merge Vary "Accept-Encoding"
</FilesMatch>

# Brotli compressed files
<FilesMatch "\\.(html|css|js|svg|xml|txt)\\.br$">
    Header set Content-Encoding "br"
    Header always set Vary "Accept-Encoding"
</FilesMatch>

# Gzip compressed files
<FilesMatch "\\.(html|css|js|svg|xml|txt)\\.gz$">
    Header set Content-Encoding "gzip"
    Header always set Vary "Accept-Encoding"
</FilesMatch>

# Content-Type headers for specific file types (all compression formats)
<FilesMatch "\\.(html|htm)(\\.br|\\.gz)?$">
    Header set Content-Type "text/html;charset=utf-8"
</FilesMatch>

<FilesMatch "\\.css(\\.br|\\.gz)?$">
    Header set Content-Type "text/css;charset=utf-8"
</FilesMatch>

<FilesMatch "\\.js(\\.br|\\.gz)?$">
    Header set Content-Type "application/javascript;charset=utf-8"
</FilesMatch>

<FilesMatch "\\.svg(\\.br|\\.gz)?$">
    Header set Content-Type "image/svg+xml;charset=utf-8"
</FilesMatch>

<FilesMatch "\\.xml(\\.br|\\.gz)?$">
    Header set Content-Type "application/xml;charset=utf-8"
</FilesMatch>

<FilesMatch "\\.txt(\\.br|\\.gz)?$">
    Header set Content-Type "text/plain;charset=utf-8"
</FilesMatch>

# Image format Content-Type headers
<FilesMatch "\\.avif$">
    Header set Content-Type "image/avif"
</FilesMatch>

<FilesMatch "\\.webp$">
    Header set Content-Type "image/webp"
</FilesMatch>

<FilesMatch "\\.(png)$">
    Header set Content-Type "image/png"
</FilesMatch>

<FilesMatch "\\.(jpg|jpeg)$">
    Header set Content-Type "image/jpeg"
</FilesMatch>

<FilesMatch "\\.gif$">
    Header set Content-Type "image/gif"
</FilesMatch>

<FilesMatch "\\.ico$">
    Header set Content-Type "image/x-icon"
</FilesMatch>

# Vary header for all image formats (for content negotiation)
<FilesMatch "\\.(avif|webp|png|jpg|jpeg|gif|svg)$">
    Header always merge Vary "Accept"
</FilesMatch>

<FilesMatch "\\.pdf$">
    Header set Content-Type "application/pdf"
</FilesMatch>

<FilesMatch "\\.zip$">
    Header set Content-Type "application/zip"
</FilesMatch>

<FilesMatch "\\.ini$">
    Header set Content-Type "text/plain"
</FilesMatch>

# Hash-prefixed image files (_i*)
<FilesMatch "^_i[a-f0-9]+$">
    Header always set Cache-Control "public,immutable"
    Header always merge Vary "Accept"
</FilesMatch>

# Security headers for HTML pages
<FilesMatch "\\.(html|htm)(\\.br|\\.gz)?$">
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</FilesMatch>

# Cache-Control headers
# HTML pages - no-cache
<FilesMatch "\\.(html|htm)(\\.br|\\.gz)?$">
    Header always set Cache-Control "public,no-cache"
</FilesMatch>

# Hashed static files (CSS, JS, images) - immutable
<FilesMatch "\\.(css|js|svg|jpg|jpeg|png|gif|ico|avif|webp|mp4)(\\.br|\\.gz)?$">
    Header always set Cache-Control "public,immutable"
</FilesMatch>

# Negotiated image URLs (_i*) - immutable
<FilesMatch "^_i[a-f0-9]+$">
    Header always set Cache-Control "public,immutable"
</FilesMatch>

# PDF, ZIP, XML, INI
<FilesMatch "\\.(pdf|zip|xml|ini|txt)(\\.br|\\.gz)?$">
    Header always set Cache-Control "public,no-cache"
</FilesMatch>

ExpiresActive On

# Hashed static files (CSS, JS, images) - 10 years
<FilesMatch "\\.(css|js|svg|jpg|jpeg|png|gif|ico|avif|webp)(\\.br|\\.gz)?$">
    ExpiresDefault "access plus 10 years"
</FilesMatch>

# Negotiated image URLs (_i*) - 10 years
<FilesMatch "^_i[a-f0-9]+$">
    ExpiresDefault "access plus 10 years"
</FilesMatch>

# PDF, ZIP, XML, INI - 1 hour
<FilesMatch "\\.(pdf|zip|xml|ini|txt)(\\.br|\\.gz)?$">
    ExpiresDefault "access plus 1 hour"
</FilesMatch>
`;
}

/**
 * `.htaccess` stage. Generates `<outDir>/.htaccess` for the built artifact.
 * The file deploys alongside the site on Apache hosts and mirrors the nginx.conf
 * content-negotiation, cache, and security-headers configuration (br+gz only).
 */
export const htaccessStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const content = generateHtaccess();
    const destination = path.join(ctx.outDir, '.htaccess');

    await assertArtifactPath(ctx.outDir, destination);
    await fs.writeFile(destination, content, 'utf8');
};

