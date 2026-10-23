# Public-site rebuilds

After a successful `CI` run for a push to `main` in `nuckty` or `nuckty-docs`, `rebuild-sites.yml` dispatches `CI` in `nuckty-site` and `nuckty-demo`. Both consumers resolve the latest successful main-push CI commit of the engine and documentation. Their existing build, test, validation and static-only deployment steps remain the delivery gate. Pull requests and failed source checks do not dispatch consumers.

## Active installation

The organization-owned [nuckty-site-rebuild](https://github.com/organizations/nuckty/settings/installations/174584866) App (ID `5445873`) is installed only in `nuckty-site` and `nuckty-demo`, with Actions read/write and Metadata read. Both source repositories have the App ID variable and private-key secret configured. The private key belongs in GitHub Secrets only.

## One-time GitHub App setup

1. Open the nuckty organization settings → Developer settings → GitHub Apps → New GitHub App. Use a unique name such as `nuckty-site-rebuild`, homepage `https://github.com/nuckty`, and disable webhooks. No callback URL or user authorization is needed.
2. Set Repository permissions → Actions → Read and write. Metadata read is automatic; leave all other permissions disabled. Restrict installation to this account.
3. Create the App, note its App ID, and generate a private key. Keep the downloaded key private; do not commit it.
4. Install the App in the nuckty organization, selecting only `nuckty-site` and `nuckty-demo`.
5. In both source repositories (`nuckty/nuckty` and `nuckty/nuckty-docs`), set Actions variable `NUCKTY_REBUILD_APP_ID` to the App ID and Actions secret `NUCKTY_REBUILD_APP_PRIVATE_KEY` to the complete PEM key. An organization variable/secret restricted to those two source repositories is also supported.
6. Push a change to either source repository and wait for `CI`, then `Rebuild public sites`, then both consumer `CI` runs and their deploy steps. A failed consumer check prevents its deployment.

Until the App ID is configured, the rebuild job is skipped. Consumer pushes and manual CI runs still build and deploy using the latest verified source commits. Installation tokens are temporary and limited to Actions in the two consumer repositories; they do not grant repository-content write access or server access.
