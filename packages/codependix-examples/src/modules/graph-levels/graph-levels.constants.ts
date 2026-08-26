// ♟️ Constants

/** Path segment the shared fixture workspace sits under, inside `fixtures/`. */
export const ATLAS_FIXTURES_SEGMENT = "atlas";

/** The fixture project every one of the four graph levels is built from. */
export const ATLAS_SERVICE_ROOT = "packages/atlas-service";

/** Subdirectory of the fixture project holding its Python package. */
export const ATLAS_PYTHON_ROOT = "packages/atlas-service/python";

/** File name the Nx Neighborhood JSON export is committed as. */
export const NEIGHBORHOOD_JSON_FILE = "codependix-neighborhood-graph.json";

/** File name the Nx Workspace Graph JSON export is committed as. */
export const WORKSPACE_JSON_FILE = "codependix-workspace-graph.json";

/** File name the NestJS module graph JSON export is committed as. */
export const MODULE_JSON_FILE = "codependix-module-graph.json";

/** File name the TypeScript import graph JSON export is committed as. */
export const IMPORTS_JSON_FILE = "codependix-imports-graph.json";

/** File name the Python import graph JSON export is committed as. */
export const PYTHON_IMPORTS_JSON_FILE = "codependix-python-imports-graph.json";
