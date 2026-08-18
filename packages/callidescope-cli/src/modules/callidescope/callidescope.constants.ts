// ♟️ Constants

/**
 * Whether a `new` expression pushes a frame.
 *
 * It does. Constructors in this repository do real work — reading files,
 * building indexes — so treating construction as free would understate every
 * stack that runs through one.
 */
export const INCLUDE_CONSTRUCTOR_EDGES = true;

/** File a project's embedded section is spliced into. */
export const PROJECT_README_NAME = "README.md";
