# Release Process

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/) on merge to `main` — commits are analyzed, the version is bumped (`feat` → minor, `fix` → patch, `BREAKING CHANGE` → major), and a GitHub release + `CHANGELOG.md` entry are generated. See [release.config.cjs](../../configuration/release.config.cjs) for configuration.
