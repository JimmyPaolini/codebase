// Codometer configuration for lexico-components.
// Measures what `nx run lexico-components:build` emits, and fails when it
// exceeds the limit declared here.
// Run via: nx run lexico-components:codometer
// Docs: packages/codometer-cli/README.md
//
// This project carries a configuration file of its own because its limit is
// declared here rather than in its manifest, which is where the convention
// every other package follows reads one from.
//
// ⚠️ The 200 KB limit is a ratchet against the measured size, not a design
// target. The output is 191 KB gzipped because the Vite library build ships
// React and Radix inside it rather than leaving them external, even though
// React is a peer dependency. Until that is fixed the limit exists to catch
// growth, not to express an intended size. The original 25 KB target has never
// been met, and nothing enforced it: the build workflow measured sizes with
// `size-limit --json || echo '[]'`, which swallowed the failure.
//
// A folder's own configuration fully replaces the workspace one, so everything
// this project is measured by is written here.
//
// `directory` is how the target reaches the tree the build is written to,
// which sits two levels above this project.

module.exports = {
  limits: [{ metric: "Library bundle.size", value: "200 KB" }],
  targets: [
    {
      analyses: ["size"],
      compression: "gzip",
      directory: "../..",
      include: ["dist/packages/lexico-components/**/*.js"],
      name: "Library bundle",
    },
  ],
};
