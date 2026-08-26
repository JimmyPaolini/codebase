// ♟️ Constants

/**
 * What separates one project name from the next, on the way in and on the
 * way out.
 *
 * One constant for both because it is one contract: what this command prints
 * is fed straight back to `callidescope --directories`, which splits on the
 * same character `--projects` was split on.
 */
export const PROJECT_SEPARATOR = ",";
