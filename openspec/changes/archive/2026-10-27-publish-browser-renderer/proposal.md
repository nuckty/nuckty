# Publish the browser renderer entry

## Why
The website and demo previews currently bundle unpublished engine source files. Registry-only consumers need a compiled renderer entry in the published archive.

## What Changes
Expose the pure renderer and template collection through `@nuckty/core/browser`, without Node-only build or template-context APIs. Verify the packed entry can bundle for a browser and matches the engine renderer.

## Impact
Core package exports, build entries, browser entry tests and package documentation.
