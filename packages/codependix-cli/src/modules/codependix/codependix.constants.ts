// ♟️ Constants

/** Graph type `codependix-nestjs` builds. */
export const NESTJS_GRAPH_TYPE = "nestjs";

/** Graph type this ticket's `codependix-nx` package builds. */
export const NX_GRAPH_TYPE = "nx";

/** Usage message shown when the command line names neither or both modes. */
export const USAGE_MESSAGE =
  "💡 Usage: codependix --check (or codependix --write)";

/**
 * The `projectName` reported for the Workspace Graph's result.
 *
 * The Workspace Graph is not a real Nx project — it is exported once for the
 * whole repository — but `ProjectRunResult` is otherwise keyed by project
 * name, so this stands in for it wherever a result is reported.
 */
export const WORKSPACE_GRAPH_PROJECT_NAME = "workspace";
