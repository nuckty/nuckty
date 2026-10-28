# Scope official npm packages

## Why
The official npm organization owns the `@nuckty` namespace. Package names must identify official packages without restricting third-party extension names.

## What Changes
Publish the engine as `@nuckty/core` and official extensions as `@nuckty/ext-*`, retain the `nuckty` executable, and update consumers, packaging tools and documentation. Repository directory names remain unchanged.

## Impact
Package manifests, dependency locks, imports, extension configuration, consumer fixtures, starter packaging and current documentation. No registry publication is included.
