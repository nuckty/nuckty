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

/** Check parsed arguments against a command's declaration and normalize boolean options. */
export function validateCommandArgs(
    command: { flags: Readonly<Record<string, 'boolean' | 'string'>>; maxPositionals: number },
    parsed: Pick<ParsedArgs, 'positional' | 'flags'>,
): { positional: string[]; flags: Record<string, string | boolean> } {
    const flags: Record<string, string | boolean> = {};

    for (const [name, value] of Object.entries(parsed.flags)) {
        const kind = Object.hasOwn(command.flags, name) ? command.flags[name] : undefined;

        if (kind === undefined) {
            throw new Error(`unknown option --${name}`);
        }
        if (kind === 'boolean') {
            if (value !== true && value !== 'true' && value !== 'false') {
                throw new Error(`--${name} accepts only true or false`);
            }
            setFlag(flags, name, value !== 'false');
        } else {
            if (value === true || value === '') {
                throw new Error(`--${name} requires a value`);
            }
            setFlag(flags, name, value);
        }
    }
    if (parsed.positional.length > command.maxPositionals) {
        throw new Error(`expected at most ${command.maxPositionals} argument${command.maxPositionals === 1 ? '' : 's'}`);
    }

    return { positional: parsed.positional, flags };
}
