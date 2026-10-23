/**
 * Pure CLI argv parsing shared by the bin entry point and in-process tests.
 *
 * @module bin/parse-args
 */

/** Parsed CLI arguments: positional tokens plus `--flag` / `--flag value` pairs. */
export interface ParsedArgs {
    positional: string[];
    flags: Record<string, string | boolean>;
    help: boolean;
    version: boolean;
}

export interface ParseArgsOptions {
    /** Flags declared as boolean by the selected command extension. */
    booleanFlags?: readonly string[];
}

/**
 * Parse a CLI argv array into `{ positional, flags, help, version }` — a pure
 * function kept separate from `main()` so the parsing/dispatch logic is
 * testable in-process (the rest of `main()` does I/O: `process.exit`, dynamic
 * imports, loader registration). Declared boolean flags do not consume the
 * following positional token; other flags keep the generic `--flag value`
 * contract. Both forms accept `--flag=value`, and `--` ends option parsing.
 */
export function parseArgs(argv: string[], options: ParseArgsOptions = {}): ParsedArgs {
    const positional: string[] = [];
    const flags: Record<string, string | boolean> = {};
    let help = false;
    let version = false;
    let positionalOnly = false;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]!;

        if (positionalOnly) {
            positional.push(a);
            continue;
        }

        if (a === '--') {
            positionalOnly = true;
            continue;
        }

        if (a === '--help' || a === '-h') {
            help = true;
            continue;
        }
        if (a === '--version' || a === '-v') {
            version = true;
            continue;
        }
        if (a.startsWith('--')) {
            const equals = a.indexOf('=');
            const name = equals === -1 ? a.slice(2) : a.slice(2, equals);

            if (equals !== -1) {
                setFlag(flags, name, a.slice(equals + 1));
                continue;
            }

            if (options.booleanFlags?.includes(name)) {
                setFlag(flags, name, true);
                continue;
            }

            const next = argv[i + 1];
            if (next !== undefined && !next.startsWith('--')) {
                setFlag(flags, name, next);
                i++;
            } else {
                setFlag(flags, name, true);
            }
        } else {
            positional.push(a);
        }
    }
    return { positional, flags, help, version };
}

function setFlag(flags: Record<string, string | boolean>, name: string, value: string | boolean): void {
    Object.defineProperty(flags, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
    });
}
