import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * Two configured destinations, spliced with the default markers.
 *
 * The badge block is written between `CODE_STATISTICS_START` and
 * `CODE_STATISTICS_END`, and the block is **appended** when the markers are
 * absent — so the destination file needs nothing in it beforehand, and is
 * created outright when it does not exist. Both halves are worth trying: run
 * this twice and the second run rewrites the block in place rather than
 * appending a second one.
 *
 * ```bash
 * codometer --directory corpus --config examples/output/codometer.config.ts --write
 * ```
 *
 * Destinations are resolved against the **measured directory**, not against
 * this file — so `statistics.md` lands inside the corpus. That is deliberate
 * here: it is also what [self-excluded.config.ts](./self-excluded.config.ts)
 * demonstrates, since a file codometer would write is never a file it measures.
 */
const codometerConfiguration: CodometerConfiguration = {
  output: {
    json: { indentation: 2, path: "codometer-report.json" },
    markdown: {
      description: "Measured from the sample corpus.",
      path: "statistics.md",
    },
  },
  python: { command: "uv run python" },
};

export default codometerConfiguration;
