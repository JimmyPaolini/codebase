// ♟️ Constants

/** Directories a workspace keeps its projects in. */
export const PROJECT_CONTAINER_DIRECTORIES = [
  "applications",
  "packages",
  "tools",
] as const;

/** Matches a test file, whatever tier it declares. */
export const TEST_FILE_PATTERN =
  /\.(?:end-to-end|integration|unit)?\.?(?:spec|test)\.[cm]?[jt]sx?$/;

/**
 * The `src/` subdirectory a module identifier is derived from.
 *
 * A file under `src/modules/<name>/` is identified by that module; anything
 * else falls back to its first `src/` subdirectory, so routes and components
 * still group into something a report can name.
 */
export const MODULES_DIRECTORY = "modules";

/** Identifier used for a file sitting directly under `src/`. */
export const ROOT_MODULE_SEGMENT = "src";
