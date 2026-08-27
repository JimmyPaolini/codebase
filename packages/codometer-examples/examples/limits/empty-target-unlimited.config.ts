import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same empty target with nothing limiting it. This passes.
 *
 * The report still says `"empty": true` outright rather than leaving a consumer
 * to infer an empty match from a size of zero. A target nobody limited simply
 * measured nothing, which is unremarkable — the failure in
 * [empty-target-limited.config.ts](./empty-target-limited.config.ts) comes from
 * the limit, not from the empty match.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/limits/empty-target-unlimited.config.ts --check limits
 * echo $?   # 0
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
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
