# Release Process

Releases are fully automated on merge to `main`: [semantic-release](https://semantic-release.gitbook.io/) analyzes commits, bumps versions, and generates the GitHub release + `CHANGELOG.md`, and then `nx release publish` publishes the workspace packages to npm.
