// ♟️ Constants

import { buildExampleAnchor } from "../examples/examples.constants";

/** Prefix the scratch directories every delivery example writes into carry. */
export const SCRATCH_PREFIX = "codependix-examples-";

/** The graph every export-target example delivers, so only the target varies. */
export const SAMPLE_DIAGRAM = [
  "```mermaid",
  "graph LR",
  '  atlas_core["atlas-core"]',
  '  atlas_service["atlas-service"]',
  "  atlas_service --> atlas_core",
  "```",
].join("\n");

/** Anchor the export-target and Markdown-mode examples splice into. */
export const SAMPLE_ANCHOR = buildExampleAnchor("nx");

/** Relative path the JSON destination of every target example names. */
export const SAMPLE_JSON_PATH = "codependix-nx-graph.json";

/** The four export targets, in the order the example walks them. */
export const EXPORT_TARGETS = ["none", "json", "markdown", "both"] as const;
