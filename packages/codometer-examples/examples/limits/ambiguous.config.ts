import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A path that could name two metrics. Refused, never resolved.
 *
 * Two things together make `markdown.files` ambiguous: a target called
 * `markdown`, whose own `files` metric the path could name, and
 * `defaultTarget: "codebase"`, which makes the path readable as the codebase's
 * `markdown.files` counter too. The run fails naming both readings rather than
 * picking one, because a limit that quietly bound to the wrong metric would
 * look exactly like one that works.
 *
 * Drop the `defaultTarget` and the ambiguity goes with it — the path then reads
 * only as the target's. That is worth knowing, because it means a
 * `defaultTarget` added for convenience can break a limit written before it.
 * The fix either way is to write the target name in full:
 * `codebase.markdown.files` for the language counter, `markdown.files` for the
 * target's.
 *
 * ```bash
 * codometer --directory corpus --config examples/limits/ambiguous.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  defaultTarget: "codebase",
  limits: [{ metric: "markdown.files", value: 1 }],
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["language"],
      include: ["markdown/**/*.md"],
      name: "markdown",
    },
  ],
};

export default codometerConfiguration;
