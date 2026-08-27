import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A target whose globs matched nothing, with a limit written against it.
 *
 * This fails. Declaring a limit asserts the files are there, so an empty match
 * is a glob that stopped matching or a build that never ran — the two failures
 * a size gate exists to catch, and the two a target reporting a comfortable
 * zero would hide.
 *
 * Compare [empty-target-unlimited.config.ts](./empty-target-unlimited.config.ts),
 * which is the identical target with the limit removed and passes.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/limits/empty-target-limited.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  limits: [{ metric: "Never Built.size", value: "8 KB" }],
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["size"],
      include: ["never-built/**/*.js"],
      name: "Never Built",
    },
  ],
};

export default codometerConfiguration;
