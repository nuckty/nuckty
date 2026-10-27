/** Pure rendering APIs for browser previews; build and template-context APIs stay in the Node entry. */
export type { BemNode, BEMTree } from './bem/types.js';
export { Templates } from './bem/templates.js';
export { render, renderToHtml } from './bem/render.js';
export type { RenderOptions, HtmlOptions } from './bem/render.js';
