// Size-limit configuration for lexico-components
// Tracks shared component library bundle size to prevent regressions.
// Run via: nx run lexico-components:bundlesize (which calls `size-limit`)
// Docs: https://github.com/ai/size-limit
//
// ⚠️ The 200 KB limit is a ratchet against the measured size, not a design
// target. The bundle is 191 KB gzipped because the Vite library build inlines
// React and Radix rather than externalizing them, even though React is a
// peerDependency. Until that is fixed the limit exists to catch growth, not to
// express an intended size. The original 25 KB target has never been met, and
// nothing enforced it: the build workflow measured sizes with
// `size-limit --json || echo '[]'`, which swallowed the failure.

module.exports = [
  {
    gzip: true,
    limit: "200 KB",
    name: "Library bundle",
    path: "../../dist/packages/lexico-components/**/*.js",
  },
];
