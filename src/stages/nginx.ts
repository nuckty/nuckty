import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { getBuildConfig } from '../utils/build-config.js';

/** Resolve the platform-appropriate mime.types include path. */
function mimeTypesPath(): string {
    const isCI = process.env.CI === 'true';
    const isLinux = process.platform === 'linux';
    return (isCI || isLinux) ? '/etc/nginx/mime.types' : '/opt/homebrew/etc/nginx/mime.types';
}

/** Quote a filesystem path as one nginx config argument. */
function quoteNginxPath(value: string): string {
    if (value.length === 0) {
        throw new Error('Nginx filesystem paths must not be empty');
    }
    if (/[\0-\x1f\x7f]/.test(value)) {
        throw new Error('Nginx filesystem paths must not contain control characters');
    }
    // Nginx treats `$` as variable syntax even inside quoted arguments, and has
    // no config-string escape for a literal dollar in a filesystem path.
    if (value.includes('$')) {
        throw new Error('Nginx filesystem paths must not contain "$"');
    }

    const normalized = path.sep === '\\' ? value.replaceAll('\\', '/') : value;

    return `"${normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Normalize trailing separators while preserving POSIX and Windows roots. */
function normalizeNginxRoot(value: string): string {
    const normalized = path.sep === '\\' ? value.replaceAll('\\', '/') : value;
    if (normalized.length === 0) {
        throw new Error('Nginx filesystem paths must not be empty');
    }
    if (/^[A-Za-z]:\/+$/u.test(normalized)) {
        return normalized.slice(0, 3);
    }

    return normalized.replace(/\/+$/, '') || '/';
}

/** Keep dotted-page fallback routing and headers identical to ordinary HTML routes. */
function htmlLocationBody(): string {
    return `            if ($flat_html = "") {
                return 404;
            }
            set $target_file "html/$flat_html";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$flat_html.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$flat_html$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type text/html;
            charset utf-8;
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header Referrer-Policy "strict-origin-when-cross-origin" always;`;
}

/**
 * Generate the nginx.conf body for a site rooted at `root`. Pure string builder,
 * no template engine. Mirrors `config/config-nginx.njk` section by section.
 * `logPrefix` names the access/error log files (`/tmp/nginx-logs/<logPrefix>_access.log`).
 * `pidFile` is where nginx writes its master PID — the buildDir default makes
 * `serve`/`stop` project-scoped instead of machine-global (CMD-13: two
 * consumers/worktrees must not fight over one `/tmp/nginx.pid`).
 */
export function generateNginxConfig(root: string, logPrefix = 'nuckty', pidFile?: string, port = 8080, logDir = '/tmp/nginx-logs'): string {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid nginx port: ${port}`);
    }

    const mime = mimeTypesPath();
    const rootNorm = normalizeNginxRoot(root);
    const pid = pidFile ?? '/tmp/nginx.pid';
    const accessLog = path.join(logDir, `${logPrefix}_access.log`);
    const errorLog = path.join(logDir, `${logPrefix}_error.log`);

    return `# Nginx configuration for flat file structure with pre-compressed files
worker_processes auto;
pid ${quoteNginxPath(pid)};

events {
    worker_connections 1024;
}

http {
    include ${quoteNginxPath(mime)};

    # Map Accept-Encoding to compression directory (priority: brotli > gzip)
    map $http_accept_encoding $compression_dir {
        default         "";
        "~*(?:^|,)[ ]*br[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)"      "brotli/";
        "~*(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)"    "gzip/";
    }

    # Map compression directory to file suffix and Content-Encoding header
    map $compression_dir $compression_suffix {
        default         "";
        "brotli/"       ".br";
        "gzip/"         ".gz";
    }

    map $compression_dir $content_encoding {
        default         "";
        "brotli/"       "br";
        "gzip/"         "gzip";
    }


    # An accepted Gzip copy remains a fallback when the preferred Brotli file is absent.
    map $http_accept_encoding $gzip_accepted {
        default 0;
        "~*(?:^|,)[ ]*gzip[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)"    1;
    }

    # Modern image representations require an explicitly accepted media type.
    map $http_accept $avif_dir {
        default "/.unaccepted";
        "~*(?:^|,)[ ]*image/avif[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" "/avif";
    }
    map $http_accept $webp_dir {
        default "/.unaccepted";
        "~*(?:^|,)[ ]*image/webp[ ]*(?:;[ ]*q=(?!0(?:[.]0*)?[ ]*(?:,|$))[01](?:[.][0-9]+)?)?[ ]*(?:,|$)" "/webp";
    }

    # Convert URL to flat filename: /free/12v -> free_12v.html
    map $uri $flat_html {
        default                                        "";
        "~^/$"                                         "index.html";
        "~^/([^/]+)$"                                  "$1.html";
        "~^/([^/]+)/([^/]+)$"                          "$1_$2.html";
        "~^/([^/]+)/([^/]+)/([^/]+)$"                  "$1_$2_$3.html";
        "~^/([^/]+)/([^/]+)/([^/]+)/([^/]+)$"          "$1_$2_$3_$4.html";
        "~^/([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)$"  "$1_$2_$3_$4_$5.html";
    }

    # Compression uses flat basenames even for nested public text artifacts.
    map $uri $text_basename {
        default "";
        "~([^/]+)$" "$1";
    }

    # Detect hashed static files for cache control
    map $request_uri $is_hashed_static {
        default                                 0;
        ~*\\.(css|js|svg|jpg|jpeg|png|gif|ico|avif|webp|mp4)(?:[?].*)?$ 1;
        ~*^/_[cjs]                              1;
    }

    map $is_hashed_static $expires_time {
        0   1h;     # HTML, PDF, ZIP
        1   10y;    # Hashed assets
    }

    map $is_hashed_static $cache_control {
        0   "public, no-cache";
        1   "public, immutable";
    }

    # Temporary directories
    client_body_temp_path ${quoteNginxPath('/tmp/nginx_client_temp')};
    proxy_temp_path ${quoteNginxPath('/tmp/nginx_proxy_temp')};
    fastcgi_temp_path ${quoteNginxPath('/tmp/nginx_fastcgi_temp')};
    uwsgi_temp_path ${quoteNginxPath('/tmp/nginx_uwsgi_temp')};
    scgi_temp_path ${quoteNginxPath('/tmp/nginx_scgi_temp')};

    server {
        listen 127.0.0.1:${port};
        server_name localhost;

        access_log ${quoteNginxPath(accessLog)};
        error_log ${quoteNginxPath(errorLog)};

        root ${quoteNginxPath(rootNorm)};
        index index.html;
        error_page 404 /__nuckty_404;

        # Block direct access to compression directories (must be before trailing slash removal)
        location ~ ^/(brotli|gzip)(/|$) {
            return 404;
        }

        # Remove trailing slashes
        location ~ ^(.+)/$ {
            return 301 $1;
        }

        # Hash-prefixed SVG files (_s*) with compression support
        location ~ ^/_s([a-f0-9]+)$ {
            set $target_file "_s$1";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$target_file.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$target_file$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type image/svg+xml;
            add_header Cache-Control "public,immutable" always;
        }

        # Hash-prefixed CSS files (_c*) with compression support
        location ~ ^/_c([a-f0-9]+)$ {
            set $target_file "_c$1";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$target_file.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$target_file$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type text/css;
            add_header Cache-Control "public,immutable" always;
        }

        # Hash-prefixed JS files (_j*) with compression support
        location ~ ^/_j([a-f0-9]+)$ {
            set $target_file "_j$1";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$target_file.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$target_file$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type application/javascript;
            add_header Cache-Control "public,immutable" always;
        }

        # CSS files with pre-compression
        location ~* \\.css$ {
            set $target_file "css$uri";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$uri.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$uri$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type text/css;
        }

        # JS files with pre-compression
        location ~* \\.js$ {
            set $target_file "js$uri";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$uri.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$uri$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type application/javascript;
        }

        # SVG files with pre-compression
        location ~* \\.svg$ {
            set $target_file "svg$uri";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$uri.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$uri$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type image/svg+xml;
        }

        # XML files with pre-compression
        location ~* \\.xml$ {
            set $target_file "xml$uri";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$uri.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "$compression_dir$uri$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type application/xml;
        }

        # Sitemap.xml with compression support
        location = /sitemap.xml {
            set $target_file "xml/sitemap.xml";
            set $file_path "";
            set $encoding_header "";

            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/sitemap.xml.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "\${compression_dir}sitemap.xml$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path "/$target_file";
            }
            rewrite ^ $file_path break;

            expires $expires_time;
            add_header Cache-Control $cache_control;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            default_type application/xml;
        }

        # Hash-prefixed images (_i*) - serve original format or modern formats
        location ~ ^/_i([a-f0-9]+)$ {
            set $hash $1;

            try_files $avif_dir/$hash.avif $webp_dir/$hash.webp /png/$hash.png /jpg/$hash.jpg /jpg/$hash.jpeg /svg/$hash.svg /$hash.gif /$hash.ico /webp/$hash.webp =404;

            expires 10y;
            add_header Cache-Control "public,immutable" always;
            add_header Vary "Accept" always;
        }

        # Custom error body preserves the original 404 status.
        location = /__nuckty_404 {
            internal;
            set $file_path "/html/404.html";
            set $encoding_header "";
            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/404.html.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "\${compression_dir}404.html$compression_suffix";
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            rewrite ^ $file_path break;
            default_type text/html;
            charset utf-8;
            add_header Cache-Control "public, no-cache" always;
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
            add_header X-Frame-Options "SAMEORIGIN" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        }

        location = /robots.txt {
            try_files /robots.txt =404;
            default_type text/plain;
            add_header Cache-Control "public, no-cache";
        }

        # Text artifacts use flat compressed copies and preserve dotted HTML routes.
        location ~* \\.txt$ {
            # Only existing text artifacts may select a compressed basename.
            recursive_error_pages on;
            error_page 418 = @nuckty_html;
            error_page 404 /__nuckty_404;
            if (!-f "$request_filename") {
                return 418;
            }
            set $file_path "";
            set $encoding_header "";
            set $check_file "";
            if ($gzip_accepted = 1) {
                set $check_file "gzip/$text_basename.gz";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header "gzip";
            }
            set $check_file "";
            if ($compression_dir != "") {
                set $check_file "$compression_dir$text_basename$compression_suffix";
            }
            if (-f "$document_root/$check_file") {
                set $file_path "/$check_file";
                set $encoding_header $content_encoding;
            }
            if ($file_path = "") {
                set $file_path $uri;
            }
            rewrite ^ $file_path break;
            types { }
            default_type text/plain;
            charset utf-8;
            add_header Cache-Control "public, no-cache";
            add_header Vary "Accept-Encoding" always;
            add_header Content-Encoding $encoding_header always;
        }

        # HTML pages with pre-compression support.
        location / {
${htmlLocationBody()}
        }

        location @nuckty_html {
            # The internal text-to-page handoff must retain custom error handling.
            recursive_error_pages on;
${htmlLocationBody()}
        }

        # Non-compressible files (images, PDF, ZIP, INI, MP4)
        location ~* \\.(jpg|jpeg|png|gif|ico|avif|webp|pdf|zip|ini|mp4)$ {
            try_files $uri /jpg$uri /png$uri /webp$uri /avif$uri =404;

            expires $expires_time;
            add_header Cache-Control $cache_control;
        }
    }
}
`;
}

/**
 * Nginx config stage. Generates `<buildDir>/nginx.conf` for the built artifact
 * (root = outDir). The config serves flat HTML with pre-compression negotiation
 * and image format negotiation. The serve extension uses this generator to
 * create its own project-scoped configuration rather than starting this file.
 */
export const nginxStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await fs.mkdir(ctx.buildDir, { recursive: true });
    const pidFile = path.join(ctx.buildDir, 'nginx.pid');
    const config = generateNginxConfig(
        ctx.outDir,
        getBuildConfig(ctx).site.logPrefix,
        pidFile,
    );
    const destination = await resolveBuildFile(ctx.buildDir, 'nginx.conf');

    await fs.writeFile(destination, config, 'utf8');
};

