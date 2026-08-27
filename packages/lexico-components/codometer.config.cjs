// Codometer configuration for lexico-components.
// Measures what `nx run lexico-components:build` emits, and fails when it
// exceeds the limit declared here.
// Run via: nx run lexico-components:codometer
// Docs: packages/codometer-cli/README.md
//
// This project carries a configuration file of its own because what gates it
// is not a shape the workspace configuration can express: two limits on one
// metric, an advisory one below the ceiling, where that file declares a single
// limit per project. Both the target and the limits on it are written here.
//
// ⚠️ The 256 KB limit is a ratchet against the measured size, not a design
// target. The output is 196 KB gzipped because the Vite library build ships
// React and Radix inside it rather than leaving them external, even though
// React is a peer dependency. Until that is fixed the limit exists to catch
// growth, not to express an intended size. The original 25 KB target has never
// been met, and nothing enforced it: the build workflow discarded the failure
// the measurement reported, so the breach never reached anyone.
//
// The ceiling was 200 KB, which the bundle had grown to within 4 KB of — close
// enough that the next component added here would have failed the build with
// no warning anyone had time to act on. 256 KB is the rung above it on the
// ladder the workspace configuration describes, and the first one this bundle
// clears.
//
// A folder's own configuration fully replaces the workspace one, so everything
// this project is measured by is written here.
//
// `directory` is how the target reaches the tree the build is written to,
// which sits two levels above this project.

module.exports = {
  // Two limits on one metric: the advisory one beneath the ceiling is what used
  // to be a constant inside the pull request renderer, which meant every
  // project got the same 90% whether or not that suited it and nobody could
  // see or change it. Declared here it is visible, per project, and the report
  // carries both — the advisory state and the real ceiling — so neither masks
  // the other.
  //
  // Both are rungs on the ladder, so the advisory one is the rung below the
  // ceiling rather than a percentage of it — 75% here, where the old pair was
  // 90%. It sits below the measured 196 KB and therefore warns on every run
  // today, exactly as the 180 KB one it replaces has been doing since the
  // bundle passed it. That is the honest reading: this bundle is over budget
  // and the warning says so every time until React and Radix are externalized,
  // at which point it goes quiet and becomes an early warning again.
  limits: [
    { metric: "Library bundle.size", severity: "warn", value: "192 KB" },
    { metric: "Library bundle.size", value: "256 KB" },
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
