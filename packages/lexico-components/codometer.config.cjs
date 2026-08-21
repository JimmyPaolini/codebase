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
// been met, and nothing enforced it: the build workflow discarded the failure
// the measurement reported, so the breach never reached anyone.
//
// A folder's own configuration fully replaces the workspace one, so everything
// this project is measured by is written here.
//
// `directory` is how the target reaches the tree the build is written to,
// which sits two levels above this project.

module.exports = {
  // Two limits on one metric: the advisory one at 90% of the ceiling is what
  // used to be a constant inside the pull request renderer, which meant every
  // project got the same 90% whether or not that suited it and nobody could
  // see or change it. Declared here it is visible, per project, and the report
  // carries both — the advisory state and the real ceiling — so neither masks
  // the other.
  limits: [
    { metric: "Library bundle.size", severity: "warn", value: "180 KB" },
    { metric: "Library bundle.size", value: "200 KB" },
  ],
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
