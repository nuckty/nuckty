# Skip tooling directories in every source scan

## Why

The assets stage skipped hidden directories and `node_modules`, but the images stage and `convert-images` skipped only `.git`. `convert-images` without an argument scanned the whole project, including dependencies and built output.

## What Changes

- One shared filter skips hidden directories and `node_modules` in the assets and images stages and in `convert-images`.
- **BREAKING** `convert-images` requires the content directory argument.
