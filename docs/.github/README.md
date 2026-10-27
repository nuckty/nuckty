# Public-site rebuilds

Packages and documentation use separate delivery paths. Publishing a GitHub Release with tag `v<package.json version>` runs `publish.yml` in the package repository only after that exact commit has successful main-push `CI`. Prereleases publish to npm `beta`; stable releases use `latest`. The workflow verifies the public archive's integrity before dispatching `update-packages.yml` in `nuckty-site` and `nuckty-demo` with the selected `channel`. Package source pushes do not dispatch consumer builds.

Each updater resolves the fixed official package allowlist from public npm, checks peer compatibility, and retains exact dependency versions and registry lock integrity. Verified changes are committed by the bot and explicitly dispatch consumer `CI`; existing build, test, validation and static-only deployment steps remain the delivery gate. Incompatible package sets keep the previous dependency commit and deployment. See [release operation and npm trust setup](https://github.com/nuckty/nuckty/blob/main/.github/RELEASING.md).

Documentation remains a content source: successful main-push `CI` in `nuckty-docs` runs `rebuild-sites.yml`, which dispatches consumer `CI` directly. The website resolves the latest successfully verified documentation commit; package dependencies remain pinned to npm versions. Pull requests and failed checks do not dispatch consumers.

## Active installation

The organization-owned [nuckty-site-rebuild](https://github.com/organizations/nuckty/settings/installations/174584866) App (ID `5445873`) is installed only in `nuckty-site` and `nuckty-demo`, with Actions read/write and Metadata read. All twelve source repositories (engine, documentation and ten extensions) have the App ID variable and private-key secret configured. Private keys belong in GitHub Secrets only; extensions use a separate key from the engine and documentation. The App installation still has access only to the two consumers.

## One-time GitHub App setup

1. Open the nuckty organization settings → Developer settings → GitHub Apps → New GitHub App. Use a unique name such as `nuckty-site-rebuild`, homepage `https://github.com/nuckty`, and disable webhooks. No callback URL or user authorization is needed.
2. Set Repository permissions → Actions → Read and write. Metadata read is automatic; leave all other permissions disabled. Restrict installation to this account.
3. Create the App, note its App ID, and generate a private key. Keep the downloaded key private; do not commit it.
4. Install the App in the nuckty organization, selecting only `nuckty-site` and `nuckty-demo`.
5. In each source repository (engine, documentation and all ten documented extensions), set Actions variable `NUCKTY_REBUILD_APP_ID` to the App ID and Actions secret `NUCKTY_REBUILD_APP_PRIVATE_KEY` to the complete PEM key. An organization variable/secret restricted to those twelve source repositories is also supported.
6. For documentation, push a content change and check `CI`, `Rebuild public sites`, then the consumer `CI` deploy steps. For packages, follow the release procedure and check `Publish npm`, each consumer dependency updater, then consumer `CI`. A failed consumer check prevents its deployment.

Documentation rebuild dispatch is skipped until its App ID is configured; package release dispatch fails if its App credentials are missing. Consumer pushes and manual CI runs build and deploy from their checked-in registry lockfiles and verified documentation. Installation tokens are temporary and limited to Actions in the two consumer repositories; they do not grant repository-content write access or server access.
