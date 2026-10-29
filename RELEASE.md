# Release procedure

All eleven public packages release together with one version. Changes are committed directly to `main`.

## Record changes

Commit each change to a published package together with a changeset: run `npm run changeset`, choose the bump level and describe the change. Changesets accumulate on `main` until the next release.

## Prepare a release

1. Run `npm run version-packages`. It applies the accumulated changesets: all public packages get the new version, extension peer dependencies follow the core version, and `package-lock.json` is refreshed.
2. Review the versions and peer dependencies, then add the release entry to both root changelogs, `CHANGELOG.md` and `CHANGELOG.ru.md`.
3. Commit and push to `main`.

While `.changeset/pre.json` exists, versions are release candidates (`1.0.0-rc.N`) published under the `rc` dist-tag. Run `npx changeset pre exit` before `npm run version-packages` to release a stable version under `latest`.

## Publication

After CI succeeds on a `main` commit, the release workflow checks the registry. If any public package version from that commit is not yet published, it builds and publishes the missing versions using npm trusted publishing and pushes the package tags. Commits whose versions are already published do not release anything. The workflow can be rerun with `workflow_dispatch` to resume a partial publication; published versions are skipped.

After publication the workflow installs the published packages in an isolated registry consumer, builds and deploys the demo from the release commit, and dispatches the website update for the release channel.

Check the registry versions, dist-tag and provenance, the workflow results, both demo domains, and the website update after the release.

## Promote a version to latest

Release candidates are published under `rc`. To make an already published version the default install, run the release workflow manually on `main` with `promote-latest` set to that exact version, for example `1.0.0-rc.1`. The run checks that every public package has the version, moves only `latest` through npm trusted publishing and reads every package's dist-tags back; `rc` and `beta` stay unchanged. It publishes nothing, creates no tags and deploys nothing. The trusted publisher of each package needs the npm dist-tag permission.
