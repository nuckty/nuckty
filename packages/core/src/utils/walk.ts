/**
 * Hidden directories (`.git`, `.venv`, `.build`, …) and `node_modules` hold
 * tooling and dependencies, not site sources; source scans never enter them.
 */
export function isToolingDirectory(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}
