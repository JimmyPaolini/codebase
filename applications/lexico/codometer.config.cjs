// Codometer configuration for lexico.
// Measures what `nx run lexico:build` emits, and fails when a target exceeds
// the limit declared for it here.
// Run via: nx run lexico:codometer
// Docs: packages/codometer-cli/README.md
//
// This project carries a configuration file of its own because its targets are
// not derivable from where it sits: the four of them partition the build
// rather than overlapping, so the totals in the pull request report add up.
// The entry chunk is what every visitor downloads, the route chunks are what
// they download on navigation, and the server output never reaches the browser
// at all but still shows cold-start cost. Measuring only the entry chunk — as
// this configuration once did — reported 120 KB of a 372 KB build.
//
// A folder's own configuration fully replaces the workspace one, so everything
// this project is measured by is written here.
//
// `directory` is how each target reaches the tree the build is written to,
// which sits two levels above this project.

const compression = "gzip";
const analyses = ["size"];
const directory = "../..";

module.exports = {
  limits: [
    { metric: "Client entry JavaScript.size", value: "145 KB" },
    { metric: "Client route JavaScript.size", value: "105 KB" },
    { metric: "Client CSS.size", value: "20 KB" },
    { metric: "Server JavaScript.size", value: "185 KB" },
  ],
  targets: [
    {
      analyses,
      compression,
      directory,
      include: ["dist/applications/lexico/client/assets/index-*.js"],
      name: "Client entry JavaScript",
    },
    {
      analyses,
      compression,
      directory,
      include: [
        "dist/applications/lexico/client/**/*.js",
        "!dist/applications/lexico/client/assets/index-*.js",
      ],
      name: "Client route JavaScript",
    },
    {
      analyses,
      compression,
      directory,
      include: ["dist/applications/lexico/client/**/*.css"],
      name: "Client CSS",
    },
    {
      analyses,
      compression,
      directory,
      include: ["dist/applications/lexico/server/**/*.js"],
      name: "Server JavaScript",
    },
  ],
};
