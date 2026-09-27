# Release Process

Releases are fully automated on merge to `main`:

1. `nx release version` determines and writes package versions from conventional commits.
2. `nx release publish` publishes the publishable workspace packages to npm.
3. [semantic-release](https://semantic-release.gitbook.io/) generates GitHub release notes and updates `CHANGELOG.md`.

Nx release is the versioning authority for workspace packages; semantic-release is used for changelog and GitHub release metadata.
