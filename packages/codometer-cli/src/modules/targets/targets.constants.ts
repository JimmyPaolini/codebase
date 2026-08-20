// ♟️ Constants

/**
 * Characters that make a glob segment match more than its literal self.
 *
 * Everything before the first of them is a path the walk can descend to
 * directly, which is what keeps a target over one build directory from
 * enumerating the whole repository to find it.
 */
export const GLOB_MAGIC_CHARACTERS = /[!*+?@[\]{}()]/;

/** Separator every relative path the walk produces uses, on every platform. */
export const PATH_SEPARATOR = "/";
