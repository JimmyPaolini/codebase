// ♟️ Constants

/** Explains the dotted edges a graph with implicit dependencies renders. */
export const NX_PROJECT_GRAPH_IMPLICIT_LEGEND =
  "_Dotted edges are implicit dependencies, declared in configuration rather than imported in code._";

/** Marker block name that carries the graph inside a project's README. */
export const NX_PROJECT_GRAPH_MARKER = "nx-project-graph";

/** Mermaid diagram type and direction the graph is rendered as. */
export const NX_PROJECT_GRAPH_MERMAID_HEADER = "flowchart LR";

/** Mermaid class that draws the project the graph is centered on. */
export const NX_PROJECT_GRAPH_SUBJECT_STYLE =
  "  classDef subject stroke-width:3px";

/** Project markdown file that embeds the project graph. */
export const NX_PROJECT_GRAPH_TARGET_FILE = "README.md";

/** Sentence rendered in place of a diagram for an unconnected project. */
export const NX_PROJECT_GRAPH_UNCONNECTED =
  "_This project neither depends on nor is depended on by another project in this workspace._";
