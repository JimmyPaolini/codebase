import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same splice between markers of another name.
 *
 * Renaming them is not cosmetic. A document that *explains* the default markers
 * holds the default start marker in its own prose, so codometer reads it as
 * already carrying the block and rewrites the wrong region. Any file
 * documenting codometer therefore renames its own markers — the codometer
 * README does, and so does this package's.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/output/renamed-markers.config.ts --write
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  output: {
    markdown: {
      description: "Measured from the sample corpus.",
      endMarker: "<!-- SAMPLE_STATISTICS_END -->",
      path: "statistics.md",
      startMarker: "<!-- SAMPLE_STATISTICS_START -->",
    },
  },
  python: { command: "uv run python" },
};

export default codometerConfiguration;
