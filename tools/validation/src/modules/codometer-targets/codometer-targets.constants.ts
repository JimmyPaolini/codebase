// ♟️ Constants

/** The directories a workspace project may live in. */
export const WORKSPACE_SCOPES = ["applications", "packages", "tools"];

/** The Nx project manifest file name every project declares its targets in. */
export const PROJECT_MANIFEST_FILE_NAME = "project.json";

/** The package manifest file name a project's `sizeLimit` gate lives in. */
export const PACKAGE_MANIFEST_FILE_NAME = "package.json";

/** The target name a project's codometer measurement is declared under. */
export const CODOMETER_TARGET_NAME = "codometer";

/**
 * Configuration file names a project may carry instead of a manifest
 * `sizeLimit`, such as `lexico` and `lexico-components`, which measure several
 * bundles each and declare their limits in one of these rather than in
 * `package.json`.
 */
export const CODOMETER_CONFIG_FILE_NAMES = [
  "codometer.config.cjs",
  "codometer.config.ts",
];
