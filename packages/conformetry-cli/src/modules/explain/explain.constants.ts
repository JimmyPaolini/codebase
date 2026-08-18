// ♟️ Constants

/** Indent for an instance's verdict and considered templates. */
export const DETAIL_INDENT = "    ";

/** Indent for an instance's path. */
export const INSTANCE_INDENT = "  ";

/** Reported when a path expands to nothing the configuration calls an instance. */
export const NO_CANDIDATES_MESSAGE =
  "No instance was found at that path. Pass a path that exists, or check the instance globs in the configuration.";

/** Reported when no template shares a single file with the instance. */
export const NO_OVERLAP_MESSAGE = "nothing overlapped";

/** Raised when the command is run without a path. */
export const PATH_REQUIRED_MESSAGE =
  "explain needs a path. Pass the instance path to explain, for example a module directory.";

/** Turns a ratio into a whole-number percentage. */
export const PERCENT_SCALE = 100;
