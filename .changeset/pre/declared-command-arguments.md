---
"@nuckty/core": minor
"@nuckty/ext-command-content-external": patch
"@nuckty/ext-command-convert-images": patch
"@nuckty/ext-command-deploy-ftp": patch
"@nuckty/ext-command-serve": patch
"@nuckty/ext-command-validate-vnu": patch
---

Commands declare their arguments: `env.commands.add(name, description, handler, { flags, maxPositionals })` replaces `{ booleanFlags }`. The CLI rejects undeclared options, invalid switch values, string options without a value and extra positional arguments before calling the handler and passes switches as booleans; `validateCommandArgs` checks a declaration in tests. The first-party commands use the same messages for these errors.
