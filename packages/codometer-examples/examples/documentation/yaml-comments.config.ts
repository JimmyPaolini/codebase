import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a YAML comment block may run.
 *
 * The other half of comment length, configured apart from `documentation` and
 * enabled on its own: this file sets `yaml.comments` and no `documentation`
 * block, so not one JSDoc comment in the corpus is measured. Gating YAML prose
 * is not a reason to start gating every doc comment against the same number.
 *
 * A **block** is the run of `#` lines a reader takes as one thought. A blank
 * line ends one, and a comment trailing a value is never part of the block
 * above it — it is read with that value, not with the prose. Comments come
 * from the tokenizer rather than the text, so a `#` inside a quoted scalar
 * stays a character in a string.
 *
 * The corpus holds exactly one block, the note above `pipeline.yaml`'s anchor,
 * and this configuration declares two budgets for it. It is reported **twice**,
 * once per declared maximum, and the two disagree: one line against a maximum
 * of one holds, while twelve words against a maximum of five breaches. That is
 * the whole reason they are separate fields rather than one `maximum` steered
 * by a `unit` — a block can sit inside one budget and outside another, and a
 * shape that made them alternatives could not say so. Both numbers are far
 * below anything a repository would really write, so one short comment is
 * enough to show the check working.
 *
 * A breach here reaches the report through the same channel a JSDoc breach
 * does, and renders the same way — `kind` is what says which it was. It is
 * gated by the same `--check limits` flag, and like a documentation limit it
 * has no `metric` path to write: the blocks are found rather than addressed.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/documentation/yaml-comments.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
  yaml: {
    comments: { maximumLines: 1, maximumWords: 5, severity: "fail" },
  },
};

export default codometerConfiguration;
