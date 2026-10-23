# Maintained braces compatibility fork

This private package is derived from published `braces@3.0.3` under the MIT license; the original copyright is retained in LICENSE. Version `3.0.4-nuckty.1` identifies the local repair and is not an upstream 3.0.4 release. It must not be published.

The repair replaces recursive AST walkers and array flattening with iterative traversal to address GHSA-vfj7-8cjw-p6xm / CVE-2026-93687. Existing character and range limits and ordinary public API behavior are retained. Root npm overrides select this source explicitly; no advisory is ignored.

The release review research records original source checksums, compatibility comparisons and deep-input regression results. Keep this repair maintained until an upstream fixed release can replace it with equivalent verified behavior.

