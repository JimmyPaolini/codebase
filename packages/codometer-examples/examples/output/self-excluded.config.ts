import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * What codometer writes, it does not measure.
 *
 * Both destinations here land **inside** the corpus, which is the situation
 * every repository that splices badges into its own README is in. Codometer
 * leaves every file it would write out of what it measures, says so on the
 * console, and does it identically whatever the flags say — so a `--write` run
 * and a `--check reports` run always measure the same tree.
 *
 * The reason is circular otherwise: a badge is an image inside a link, so a
 * spliced block moves `markdown.images`, `markdown.links`, and `markdown.lines`
 * — which moves the badges, which moves the counts. A report left in would be
 * stale the moment it landed.
 *
 * The demonstration is the same run twice against a scratch copy of the corpus,
 * reading the report the second one wrote:
 *
 * ```bash
 * codometer --directory copy --config examples/output/self-excluded.config.ts --write
 * codometer --directory copy --config examples/output/self-excluded.config.ts --write
 * jq '.targets[0].files' copy/codometer-report.json   # 28
 * ```
 *
 * The first run creates `statistics.md` and `codometer-report.json`. The second
 * measures a tree that already holds both, and still reports 28 files, one
 * markdown file, and one JSON file — exactly what a run before either existed
 * reported. Each prints the notice naming what it left out.
 *
 * Read the report from **disk** rather than adding `--json` to the second run.
 * A destination named on the command line stands for all of them, so
 * `--json` replaces the configured pair with the console — and a run that was
 * never going to write those two files has no reason to exclude them, so it
 * measures 30.
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
