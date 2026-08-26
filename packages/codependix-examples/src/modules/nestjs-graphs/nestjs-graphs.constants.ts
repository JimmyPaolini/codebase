// ♟️ Constants

/** Fixture whose container holds four modules, one of them `@Global()`. */
export const GLOBAL_CONTAINER = "global-container";

/** Fixture whose container holds three modules — below the ambient minimum. */
export const SMALL_CONTAINER = "small-container";

/** Fixture whose container has a plain module every other module imports. */
export const BOUNDARY_CONTAINER = "boundary-container";

/** Fixture whose source directory defines no modules at all. */
export const EMPTY_CONTAINER = "empty-container";

/** Fixture whose options factory refuses to run if it is ever called. */
export const PREVIEW_CONTAINER = "preview-container";

/** Fixture that bootstraps a real `src/main.module.ts`. */
export const ROOTED_APPLICATION = "rooted-application";

/** Fixture whose module file throws the moment it is loaded. */
export const FAILING_CONTAINER = "failing-container";

/** Path segment every NestJS fixture sits under, inside `fixtures/`. */
export const NESTJS_FIXTURES_SEGMENT = "nestjs";
