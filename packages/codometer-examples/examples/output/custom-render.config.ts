import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A `render` that adds to the built-in report rather than replacing it.
 *
 * `renderBadges()` is the default rendering of these same statistics, handed
 * to the renderer so adding a line above them costs one template literal
 * instead of rewriting every badge group by hand.
 *
 * Supplying `render` keeps the built-in `write`: the result is still spliced
 * between the markers, into the configured path. The two halves are replaceable
 * on their own, and supplying one never opts out of the other.
 *
 * ```bash
 * codometer --directory corpus --config examples/output/custom-render.config.ts --write
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  output: {
    markdown: {
      path: "statistics.md",
      render: ({ renderBadges, statistics }) =>
        [
          `**${statistics.sourceFiles} source files**, `,
          `${statistics.linesOfCode} lines of code.\n`,
          renderBadges(),
        ].join(""),
    },
  },
  python: { command: "uv run python" },
};

export default codometerConfiguration;
