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

/** The flag naming projects outright. */
export const PROJECTS_FLAG = "--projects";

/** The flag naming projects by a tag they carry. */
export const TAGS_FLAG = "--tags";

/** A well-formed `--projects`, quoted back when the flag was written wrong. */
export const PROJECTS_EXAMPLE = `${PROJECTS_FLAG} callidescope-cli${PROJECT_SEPARATOR}callidescope-graph`;

/** A well-formed `--tags`, quoted back when the flag was written wrong. */
export const TAGS_EXAMPLE = `${TAGS_FLAG} type:package${PROJECT_SEPARATOR}language:typescript`;
