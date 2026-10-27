# npm releases

Each package is released independently from its repository with `publish.yml`. A new source push runs CI but does not publish a package or update the public consumers.

1. Set the intended exact version in `package.json` and regenerate its lockfile with `npm version <version> --no-git-tag-version`. Review extension peer compatibility when changing the core version.
2. Commit and push the change to `main`; wait for successful `CI` on that exact commit.
3. Publish a GitHub Release with tag `v<version>` pointing to that commit. Mark versions containing a hyphen as prereleases. Draft releases and unmatched versions do not publish.
4. Check `Publish npm`: the workflow packs the verified commit, publishes through OIDC, and checks the public metadata and downloaded archive integrity before dispatching consumer updates. Prereleases use `beta`; stable releases use `latest`.

`update-packages.yml` in website and demo resolves the selected channel to exact official package versions, checks peer compatibility, and verifies the consumers before committing dependency updates and starting deployment CI. Incompatible package sets leave the previous consumer commit unchanged; publish compatible extension versions before retrying the updater. Existing versions are immutable: reruns accept only the same archive integrity and do not replace package bytes or move distribution tags backwards.

## Trusted publisher setup

For each public package, configure npm GitHub Actions trusted publishing for organization `nuckty`, its own repository, workflow filename `publish.yml`, and environment `npm`. Enable direct `npm publish`; separate `npm dist-tag` access is not required. The GitHub environment is also named `npm`. Publishing uses GitHub-hosted runners and pinned npm `11.21.1`, with `id-token: write` restricted to the publishing job. No npm write token is used.

The existing organization GitHub App must retain Actions write access limited to `nuckty-site` and `nuckty-demo`; its ID and private key are configured as `NUCKTY_REBUILD_APP_ID` and `NUCKTY_REBUILD_APP_PRIVATE_KEY` in each package repository. The App only dispatches the consumer updater workflows.

New npm trusted publisher configurations expire if their first successful publication does not happen within two days. The first real release is the end-to-end OIDC verification; local guard tests and normal CI cannot prove npm trust exchange. Do not create a disposable version to test this workflow. If the connection expires before the intended release, recreate it immediately before that release. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
