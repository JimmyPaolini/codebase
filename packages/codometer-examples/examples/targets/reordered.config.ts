import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same targets with every `include` array written backwards.
 *
 * Negations form **one set applied to the whole target** rather than being read
 * in order, so putting the `!` first cannot change what the target holds. The
 * test beside these files measures both configurations and asserts the two
 * reports name the same files — which is the only way to state a property
 * about an ordering nobody can see.
 *
 * ```bash
 * codometer --directory corpus --config examples/targets/reordered.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["language", "size"],
      compression: "gzip",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
    {
      analyses: ["size"],
      // The negation first, the glob that adds files second.
      directory: "..",
      include: ["!compiled/**/vendor.js", "compiled/**/*.js"],
      name: "Compiled Without Vendor",
    },
    {
      analyses: ["language"],
      exclude: ["**/*.test.ts"],
      include: ["typescript/**/*.ts"],
      name: "Sources",
    },
    {
      analyses: ["size"],
      compression: "none",
      directory: "..",
      include: ["project.json", "package.json"],
      name: "Manifests",
    },
  ],
};

export default codometerConfiguration;
