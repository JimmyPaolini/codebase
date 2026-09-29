# Release Process

Releases are fully automated on merge to `main`:

1. `nx release version` determines and writes each ic-suite package's version from conventional commits.
2. `nx release publish` publishes the ic-suite packages to npm.
3. [semantic-release](https://semantic-release.gitbook.io/) bumps the root `package.json` version, syncs it into the root README title, generates GitHub release notes, and updates `CHANGELOG.md`.

Nx release owns the independent ic-suite package versions (tagged `<project>@<version>`); semantic-release owns the single codebase version (tagged `v<version>`).
