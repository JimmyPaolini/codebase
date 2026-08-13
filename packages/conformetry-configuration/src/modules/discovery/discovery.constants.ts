// ♟️ Constants

/** Prefix of the `project.json` tag that names a project's generator. */
export const GENERATOR_TAG_PREFIX = "generator:";

/** Project metadata file read during discovery. */
export const PROJECT_METADATA_FILENAME = "project.json";

/** Fallback project type when none can be derived from the path. */
export const DEFAULT_PROJECT_TYPE = "applications";

/** Python project metadata file, read for a project description. */
export const PYPROJECT_FILENAME = "pyproject.toml";

/** Extracts the `description` field from a `pyproject.toml`. */
export const PYPROJECT_DESCRIPTION_PATTERN =
  /^description\s*=\s*["'](?<description>.*)["']$/mu;
