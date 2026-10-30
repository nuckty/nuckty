# Remove website requirements and stale wording from the specs

## Why

Several capabilities carried requirements for the documentation website's own hooks and checkers, which are not in this repository, and a few requirements still described removed behavior: asset basenames the build no longer produces, a legacy asset hash route, serialized article content, an unpublished `nuckty` dependency and a deploy-ftp scenario contradicting its own requirement.

## What Changes

- Remove website and process requirements from `pipeline`, `blocks`, `release-audit`, `extensions` and `core`; move the CSS lint requirement to `demo`.
- Correct the stale requirements in `core`, `compression`, `output-integrity`, `ext-command-deploy-ftp`, `sitemap` and `demo`.
- Keep the `levels entry point` rules inside their requirement and drop blank lines after headings in `extensions` and `templates`.
