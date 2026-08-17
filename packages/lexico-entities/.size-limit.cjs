// Size-limit configuration for this package.
// Measures the JavaScript that `nx run <project>:build` emits, and fails when it
// exceeds the `sizeLimit` this package declares in its package.json. A package
// without a `sizeLimit` is still measured and reported, just not gated.
// Run via: nx run <project>:bundlesize (which calls `size-limit`)
// Docs: https://github.com/ai/size-limit
//
// The limit lives in package.json, alongside `typeCoverage`, so that this file
// stays identical across every package the service generator produces.
const path = require("node:path");

const { sizeLimit } = require("./package.json");

// `dist` mirrors each project's own path under the workspace root.
const project = path.basename(__dirname);
const group = path.basename(path.dirname(__dirname));

const check = {
  gzip: true,
  name: "Compiled JavaScript",
  path: `../../dist/${group}/${project}/**/*.js`,
};

if (sizeLimit !== undefined) check.limit = sizeLimit;

module.exports = [check];
