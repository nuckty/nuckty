## 1. Implement and verify
- [x] Reproduce the real release failure before npm publication.
- [x] Build explicitly and isolate npm pack JSON from lifecycle output.
- [x] Test real npm packing with a noisy prepack fixture and review all eleven copies.
- [x] Verify the repaired real beta2 release through OIDC.

## Real release verification

Core `1.0.0-beta2` published through GitHub Actions OIDC run `40473061994` after exact source CI passed. The package job built explicitly and parsed lifecycle-free npm pack JSON; the publish job used an absolute archive path and verified public metadata and downloaded archive integrity before dispatching consumer updates. No manual npm publish fallback was used.
