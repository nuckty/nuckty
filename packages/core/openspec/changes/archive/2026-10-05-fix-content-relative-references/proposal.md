# Resolve content-relative references independently of the directory name

## Why

Nested Markdown links and images fail when the content root is `content/` or a custom directory. Resolvers strip only `external/<repo>/` from inputPath. A malformed sitemap entry can also be skipped with a warning, producing a successful empty or incomplete artifact.

## What Changes

- Add optional sourceFile, relative to the selected content root, to Markdown and shared image options; pass it from sitemap and HTML stages without changing inputPath.
- Use sourceFile for source-relative lookups, retaining legacy inputPath fallback for standalone callers.
- Reject malformed declared sitemap entries instead of silently dropping pages.
- Correct layout metadata requirements: the consumer document handler selects markup; the engine does not select a default layout.
- Add behavioral regressions and verify the full documentation under local, external and custom content roots.

## Impact

Core Markdown/image resolvers, sitemap/HTML stages, their tests, markdown/sitemap specifications and paired documentation. Existing option shapes remain valid; unsupported sitemap entries become explicit failures.
