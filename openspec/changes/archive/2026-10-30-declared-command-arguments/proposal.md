# Commands declare their arguments

## Why

Every command checked unknown options, boolean values and positional counts with its own code and messages, and the core only knew which options were switches.

## What Changes

- **BREAKING** `env.commands.add` takes `{ flags, maxPositionals }` instead of `{ booleanFlags }`; the CLI rejects undeclared options, invalid switch values, string options without a value and extra positional arguments before calling the handler, and passes switches as booleans.
- The core exports `validateCommandArgs` for testing a declaration.
- The serve, stop, validate, deploy-ftp, convert-images and content-external commands declare their arguments instead of validating them.
