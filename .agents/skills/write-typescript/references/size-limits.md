# Size Limits

Hard ESLint errors apply to source files. Test files (`*.test.ts`, `testing/**`) and `*.config.*` files are exempt from all of them, so a large test file is fine and a large service file is not.

| Limit                                         | Max                                                |
| --------------------------------------------- | -------------------------------------------------- |
| Lines per file (`max-lines`)                  | 512                                                |
| Lines per function (`max-lines-per-function`) | 128                                                |
| Statements per function (`max-statements`)    | 16                                                 |
| Block nesting depth (`max-depth`)             | 4                                                  |
| Nested callbacks (`max-nested-callbacks`)     | 3                                                  |
| Classes per file (`max-classes-per-file`)     | 1                                                  |
| Function parameters (`better-max-params`)     | 3 — constructors 12, functions in `*.module.ts` 12 |
| Cyclomatic complexity                         | 8 (warning)                                        |
| Nested `describe` blocks                      | 3                                                  |

When a file nears 512 lines, split it along the module file suffixes (`*.types.ts`, `*.constants.ts`, another `*.service.ts`) instead of raising the limit. Never add a disable comment or edit the threshold to make a file fit.

**Comment blocks are capped at 128 words**, and shell at 256 — declared in
`configuration/codometer.config.ts` and enforced by codometer rather than ESLint, so a breach names a file and line rather than a rule. Shell is looser because `scripts/shell/` holds command references whose whole body is one block documenting flags. The budget is per block, never file-wide, and `maximumCharacters`, `maximumLines`, and `maximumWords` are separate fields rather than one steered by a unit — nothing is defaulted to a number, so a budget nobody wrote is one nobody chose. A `comment` selector can also narrow to a documented declaration's JSDoc-style comment by `kind`, but this repository declares none: gating this prose is not a reason to start gating every JSDoc comment against the same budget. The `codometer-configure` skill covers how a block is delimited and which languages are measured how accurately; `codometer-triage` covers a breach.

**Compiled size is gated per project** by each `codometer.config.ts`, and `codebase:codometer` gates the repository-wide limits. Both run through `make-projects` rather than 🧑‍💻 Lint Codebase, because a project has to compile before it can be measured.
