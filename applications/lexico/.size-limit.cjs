// Size-limit configuration for lexico
// Tracks client-side bundle sizes to prevent regressions.
// Run via: nx run lexico:bundlesize (which calls `npx size-limit`)
// Docs: https://github.com/ai/size-limit
//
// The four checks partition the build rather than overlapping, so the totals in
// the pull request comment add up: the entry chunk is what every visitor
// downloads, the route chunks are what they download on navigation, and the
// server bundle never reaches the browser at all but still shows cold-start
// cost. Measuring only the entry chunk — as this config used to — reported
// 120 KB of a 372 KB build.

module.exports = [
  {
    gzip: true,
    limit: "145 KB",
    name: "Client entry JavaScript",
    path: "../../dist/applications/lexico/client/assets/index-*.js",
  },
  {
    gzip: true,
    limit: "105 KB",
    name: "Client route JavaScript",
    path: [
      "../../dist/applications/lexico/client/**/*.js",
      "!../../dist/applications/lexico/client/assets/index-*.js",
    ],
  },
  {
    gzip: true,
    limit: "20 KB",
    name: "Client CSS",
    path: "../../dist/applications/lexico/client/**/*.css",
  },
  {
    gzip: true,
    limit: "185 KB",
    name: "Server JavaScript",
    path: "../../dist/applications/lexico/server/**/*.js",
  },
];
