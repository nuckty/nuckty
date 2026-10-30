import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NucktyConfig } from '../targets/config.js';

let configLoadId = 0;

/** The fixed consumer config location, relative to the consumer root. */
export const CONFIG_REL_PATH = path.join('config', 'config-nuckty.ts');

/**
 * Resolve `config/config-nuckty.ts` and import its default export. Only a
 * missing config file falls back to a single default target. Any error from
 * loading an existing file — a missing import or package, a syntax error, a
 * thrown error, a missing default export — propagates, so the clean stage
 * never runs against substituted targets.
 */
export async function loadConfig(cwd: string): Promise<NucktyConfig> {
    const configPath = path.join(cwd, CONFIG_REL_PATH);
    if (!existsSync(configPath)) {
        return { targets: { default: { configDir: 'config/', outDir: 'site/' } } };
    }
    const url = pathToFileURL(configPath).href;
    const mod = (await import(`${url}?nucktyBuild=${++configLoadId}`)) as { default?: NucktyConfig };
    if (!mod.default) {
        throw new Error(`nuckty: ${CONFIG_REL_PATH} has no default export`);
    }
    return mod.default;
}
