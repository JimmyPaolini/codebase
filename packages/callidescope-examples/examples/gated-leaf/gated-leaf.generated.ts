/**
 * Output a generator writes into this project, which the project keeps out of
 * its own trace.
 *
 * The `callidescope.config.ts` beside this file excludes `*.generated.ts`, and
 * that glob is read relative to this project's own root — so it names this file
 * and there is no spelling of it that could name
 * `../inherited-limits/inherited-limits.generated.ts`, which is the same file
 * one directory over. `README.md` has the pair, and the two file counts that
 * prove it.
 */
export function listGatedLeafKeys(): string[] {
  return ["one", "two"];
}
