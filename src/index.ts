// BEMJSON data model — the foundation.
export * from './bem/types.js';

// xjst authoring API: `block('x')({ tag: 'ul' })` etc.
export { block, createBlockFor } from './bem/api.js';
export type { BlockEntry, Selector } from './bem/api.js';
export type { Modes, Predicate } from './bem/template-types.js';

// Consumer-owned document entry point.
export { DocumentFacade } from './document/document.js';
export type { DocumentAssets, DocumentData, DocumentHandler } from './document/document.js';

// Template collection + renderer — for advanced use.
export { Templates } from './bem/templates.js';
export { runWithTemplates } from './bem/template-context.js';
export { render } from './bem/render.js';
export type { RenderOptions } from './bem/render.js';

// Naming helpers (diagnostics/dev).
export { classify, stringifyEntity, parseClass } from './bem/naming.js';

// markdown → BemNode bridge.
export { createMarkdown } from './markdown/index.js';
export type { MarkdownOptions, MarkdownResult } from './markdown/index.js';
// Image-path resolver shared by the markdown bridge and markdown-extensions
// that rewrite image URLs (e.g. a gallery directive handler).
export { transformImagePathShared } from './markdown/image-mapping.js';
export type { ImageMappingEnv } from './markdown/image-mapping.js';
// Source git-mtime (for footer `lastUpdated`, `sitemap.xml <lastmod>`). A
// pipeline-extension reading a page's source `.md` mtime uses this.
export { getFileTimestamp, formatLastUpdated } from './utils/timestamp.js';
// Project-root discovery + content root (external aggregate or `content/`).
// A pipeline-extension that reads source files (e.g. for mtime) resolves them
// against the content root.
export { getRoot, getExternalContent } from './utils/dir.js';

// Programmatic pipeline.
export { Pipeline } from './pipeline/pipeline.js';
export type { Phase, Stage, BuildContext } from './pipeline/pipeline.js';
export { generateNginxConfig } from './stages/nginx.js';

// Plugin environment.
export { NucktyEnv } from './env/env.js';
export type { CommandArgs, CommandHandler, CommandEntry, CommandOptions, DirectiveNode, DirectiveHandler } from './env/env.js';
export { loadPlugins } from './env/loader.js';
export type { PluginModule, LoadOptions } from './env/loader.js';

// Targets + consumer config.
export { defineNucktyConfig, resolveTarget, allTargets, resolveAlternates } from './targets/config.js';
export type { Target, NucktyConfig, AlternateEntry, Alternates } from './targets/config.js';

// Consumer config loading (env entry point used by the CLI and extensions).
export { loadConfig } from './env/config.js';

// Captured target configuration for pipeline extensions.
export { getBuildConfig } from './utils/build-config.js';
export type { BuildConfigSnapshot } from './utils/build-config.js';

// Build entry point (used by the CLI).
export { runBuild } from './build.js';
export type { BuildCommand } from './build.js';

// Consumer artifact destination validation before filesystem access.
export { assertArtifactPath } from './stages/artifact-path.js';

