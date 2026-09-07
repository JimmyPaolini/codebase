import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a comment block may run, across every language that has comments.
 *
 * `comments` at the top level is the repository-wide budget, and a language's
 * own block is merged field by field over it. Here shell is loosened to eight
 * words while Python, TOML, and YAML stay at three — enough to show that an
 * override changes the field it names and leaves the rest alone.
 *
 * A **block** is the run of comment lines a reader takes as one thought. A
 * blank line ends one, a comment trailing a value is never part of the block
 * above it, and a `#!` shebang is never a comment at all — without that last
 * rule every shell script opening with one would measure a block whose first
 * word is `!/usr/bin/env`.
 *
 * Python and YAML are read by real tokenizers — `tokenize` in the Python
 * subprocess, the `yaml` package's CST for YAML — so a `#` inside a string
 * literal is never mistaken for a comment in either. Shell and TOML are read
 * by a line scanner that cannot tell the two apart, exactly as their own
 * `comments` counters already cannot.
 *
 * No `documentation` block is set, so not one JSDoc comment is measured: the
 * two checks are enabled separately even though they share every field name
 * and reach the report through one channel.
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
