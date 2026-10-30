import { Templates } from '../../bem/templates.js';
import { runWithTemplates } from '../../bem/template-context.js';
import markdownTemplates from '../../markdown/templates.js';

/** A template collection with the default Markdown templates registered. */
export function markdownCollection(): Templates {
    const templates = new Templates();

    runWithTemplates(templates, markdownTemplates);

    return templates;
}
