export function selectCoverageScripts<T extends {
    result: Array<{ url: string }>;
    'source-map-cache'?: Record<string, { data?: unknown }>;
}>(report: T, projectRoot: string): T;
