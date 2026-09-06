// ♟️ Constants

import type { ResolvedCallidescopeEntryPoints } from "@callidescope/configuration";

/**
 * Whether a `new` expression pushes a frame.
 *
 * It does. Constructors in this repository do real work — reading files,
 * building indexes — so treating construction as free would understate every
 * stack that runs through one.
 */
export const INCLUDE_CONSTRUCTOR_EDGES = true;

/**
 * The per-project entry-point rules the `callidescope` command supplies: none.
 *
 * The command judges every project by the one configuration the run resolved,
 * which is all it has — nothing here reads a second configuration file. The
 * map is `analyze`'s seam for a caller that does hold per-project rules.
 */
export const NO_PROJECT_ENTRY_POINTS: ReadonlyMap<
  string,
  ResolvedCallidescopeEntryPoints
> = new Map();

/** File a project's embedded section is spliced into. */
export const PROJECT_README_NAME = "README.md";
