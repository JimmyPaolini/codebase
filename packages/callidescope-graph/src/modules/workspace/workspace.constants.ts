// ♟️ Constants

/** Directories a workspace keeps its projects in. */
export const PROJECT_CONTAINER_DIRECTORIES = [
  "applications",
  "packages",
  "tools",
] as const;

/**
 * Directory holding a project's test scaffolding.
 *
 * Its files are not named like tests — `mocks.ts`, `setup.ts` — but they exist
 * only for tests, and a report that counted them would describe a package's
 * fixtures as its control flow.
 */
export const TEST_DIRECTORY_SEGMENT = "testing";

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
