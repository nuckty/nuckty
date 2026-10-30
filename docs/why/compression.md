# Compression codecs

## Decision

Pre-compress eligible files with Brotli Q11 and Gzip 9. Normalize the gzip OS byte to `0xFF`. See [compression output](../out/compression.md) for the exact file selection.

## Context

The [hosting configuration](../out/hosting.md) selects a prepared representation using `Accept-Encoding`. Compression runs during the build, so serving a request does not require the same work again.

## Alternatives

**Brotli only.** A client that does not accept Brotli would receive the original file. Gzip provides an additional compressed representation.

**A third codec such as zstd.** Supporting another representation would require changes to compression, negotiation, and deployment. It should be justified by measurements on a representative corpus and by the intended clients.

**Shared dictionaries.** A dictionary-dependent representation would require an agreed dictionary and a different delivery contract. The current artifact contains independently decodable files.

## Argument

Two codecs give the current hosting generators a fixed selection order: Brotli, Gzip, then the original. They are part of the implemented artifact contract; this decision does not claim that Brotli beats every other codec on every input.

Normalizing byte 9 of the gzip header removes one platform-dependent metadata field. Identical compressed bytes also require matching inputs and compatible runtime/compressor versions. Stable bytes avoid unnecessary changes in [manifest-based publication](../ext/command/deploy-ftp.md).

## Consequences

Each selected, nonempty file receives one `.br` copy and one `.gz` copy in flat compression directories. Selection uses file extensions. Other names, `robots.txt`, and empty files are excluded. The originals remain available.

Adding a codec is a change to the artifact and hosting contract. Benchmark results and client requirements should be recorded before making that change.

