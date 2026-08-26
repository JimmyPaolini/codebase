import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The one place ignore rules do not reach.
 *
 * `corpus/.gitignore` names `generated/`, and discovery reads that file itself
 * rather than invoking git — so whatever is put in there is invisible to the
 * codebase target. A declared target's globs are the exception, and that
 * exception is the whole reason targets exist: a build directory is precisely
 * the thing every repository ignores and every repository wants to gate the
 * size of.
 *
 * `generated/` is empty in a fresh checkout, because a file that is both
 * tracked and ignored breaks `git add` for everyone afterwards. Fill it from
 * the committed samples first:
 *
 * ```bash
 * cp -R packages/codometer-examples/compiled packages/codometer-examples/corpus/generated
 * codometer --directory corpus --config examples/targets/ignored.config.ts
 * ```
 *
 * The codebase target still reports 28 files, exactly as it did before the copy
 * — and `Ignored Output` reports the two that discovery refused to walk into.
 * Delete `corpus/generated` afterwards; nothing else needs it.
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["language", "size"],
      compression: "gzip",
      include: ["generated/**/*.js"],
      name: "Ignored Output",
    },
  ],
};

export default codometerConfiguration;
