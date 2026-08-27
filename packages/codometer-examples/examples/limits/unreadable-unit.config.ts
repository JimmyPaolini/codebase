import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A value nothing can read. Refused rather than guessed at.
 *
 * `"8 K"` is not a size: the trailing `b` is what makes a unit a unit, and
 * codometer will not decide on your behalf whether the author meant kilobytes,
 * kilobits, or a thousand of something else. The run fails instead of taking
 * the value as zero, which would gate everything, or as infinity, which would
 * gate nothing.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/limits/unreadable-unit.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  limits: [{ metric: "Corpus.size", value: "8 K" }],
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["size"],
      compression: "gzip",
      include: ["**/*"],
      name: "Corpus",
    },
  ],
};

export default codometerConfiguration;
