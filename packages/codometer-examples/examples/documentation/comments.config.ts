import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a comment block may run, across every language that has comments.
 *
 * `comments` at the top level is the repository-wide budget, and a language's
 * own block is merged field by field over it. Here shell is loosened to eight
 * words while every other language stays at three — enough to show that an
 * override changes the field it names and leaves the rest alone.
 *
 * A **block** is the run of comment lines a reader takes as one thought. A
 * blank line ends one, a comment trailing a value is never part of the block
 * above it, and a `#!` shebang is never a comment at all — without that last
 * rule every shell script opening with one would measure a block whose first
 * word is `!/usr/bin/env`.
 *
 * Python, YAML, CSS, and TypeScript/JavaScript's non-JSDoc comments are read by
 * a real parser or tokenizer — `tokenize` in the Python subprocess, the `yaml`
 * package's CST, postcss's own parse, the TypeScript compiler's scanner — so a
 * comment marker inside a string literal is never mistaken for a comment in
 * any of the four. Shell, TOML, SQL, and HCL are read by a line scanner (SQL
 * through the same patterns `SqlService` already strips comments with) that
 * cannot tell the two apart, exactly as those analyzers' own `comments`
 * counters already cannot.
 *
 * No `documentation` block is set, so not one JSDoc comment is measured: the
 * two checks are enabled separately even though they share every field name
 * and reach the report through one channel. The corpus's TypeScript and
 * JavaScript sources carry only JSDoc comments, so `typescript` here measures
 * nothing at all — what is absent is as informative as what breaches.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/documentation/comments.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  comments: { maximumWords: 3 },
  python: { command: "uv run python" },
  shell: { comments: { maximumWords: 8 } },
};

export default codometerConfiguration;
