// BEMJSON data model — the foundation.
export * from './bem/types.js';

// xjst authoring API: `block('x')({ tag: 'ul' })` etc.
export { block } from './bem/api.js';
export type { BlockEntry } from './bem/api.js';
export type { Modes, Predicate } from './bem/template-types.js';

// BEMJSON composition for content code and attribute selection for nu.ts templates.
export { b, attributes } from './bem/compose.js';
export type { EntityOptions } from './bem/compose.js';

// Consumer-owned document entry point.
export { DocumentFacade } from './document/document.js';
export type { DocumentAssets, DocumentData, DocumentHandler } from './document/document.js';

// Template collection + renderer — for advanced use.
export { Templates } from './bem/templates.js';
export { runWithTemplates } from './bem/template-context.js';
export { render } from './bem/render.js';
export type { RenderOptions } from './bem/render.js';

// markdown → BemNode bridge and the default templates of its `article` entities.
export { createMarkdown } from './markdown/remark.js';
export type { MarkdownOptions, MarkdownResult } from './markdown/remark.js';
export { default as markdownTemplates } from './markdown/templates.js';
// Image-path resolver shared by the markdown bridge and markdown-extensions
// that rewrite image URLs (e.g. a gallery directive handler).
export { transformImagePathShared } from './markdown/image-mapping.js';
export type { ImageMappingEnv } from './markdown/image-mapping.js';
// Manifest content hash, shared with deployment extensions.
export { generateFileHash } from './utils/hash.js';
// Entries of config/external.json, shared with the content-external command.
export { externalRepoName, parseExternalSources } from './utils/external.js';
export type { ExternalSource } from './utils/external.js';

// Programmatic pipeline.
export { Pipeline } from './pipeline/pipeline.js';
export type { Phase, Stage, BuildContext } from './pipeline/pipeline.js';
export { generateNginxConfig } from './stages/nginx.js';

// Plugin environment.
export { NucktyEnv } from './env/env.js';
export type { CommandArgs, CommandHandler, CommandEntry, CommandOptions, DirectiveNode, DirectiveHandler, DirectiveConverters, MarkdownNode, MarkdownNodeHandler } from './env/env.js';
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


export type { Plugin } from 'unified';
export type { Root } from 'mdast';
