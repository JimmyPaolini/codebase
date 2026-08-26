// ♟️ Constants

/**
 * Directory names a project scan never descends into.
 *
 * Each one either holds no source of its own (`node_modules`, dependency and
 * build caches) or is generated output (`dist`, `build`, `coverage`) — walking
 * into any of them either finds nothing or finds a `tsconfig.json` that
 * belongs to a dependency, not a project this run should trace.
 */
export const EXCLUDED_SCAN_DIRECTORY_NAMES = [
  "node_modules",
  ".git",
  ".nx",
  ".conformetry",
  "dist",
  "build",
  "coverage",
  "out",
] as const;

/**
 * The subdirectory a module identifier is derived from, used until
 * `configure` is called with a workspace's own layout.
 *
 * A file under `<root>/modules/<name>/` is identified by that module;
 * anything else falls back to its first subdirectory under the root, so
 * routes and components still group into something a report can name.
 */
export const DEFAULT_MODULES_DIRECTORY = "modules";

/**
 * Identifier used for a file sitting directly under the source root, used
 * until `configure` is called with a workspace's own layout.
 */
export const DEFAULT_ROOT_MODULE_SEGMENT = "src";

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
