# Release procedure

Add a changeset to each pull request that changes a published package. All eleven public packages release together.

The release workflow creates or updates a Version Packages pull request. Review the versions, peer dependencies, and the root English and Russian changelogs before merging it.

After the version pull request is merged, the release workflow publishes the packages using npm trusted publishing. It verifies the published packages in an isolated registry consumer, builds and deploys the demo, and dispatches the website update for the release channel.

Check the registry versions, dist-tag and provenance, the workflow results, both demo domains, and the website update after the release.
