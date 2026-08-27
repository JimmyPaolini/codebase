import { buildAnchorDocuments } from "./anchor-placement";
import { buildConfigurationDocuments } from "./configuration";
import { buildDeliveryDocuments } from "./export-delivery";
import { buildGraphLevelDocuments } from "./graph-levels";
import { buildNestjsDocuments } from "./nestjs-graphs";
import { buildNxDocuments } from "./nx-graphs";
import { buildPythonDocuments } from "./python-imports";
import { buildTypescriptDocuments } from "./typescript-imports";

import type { ExampleDocument } from "./types";

// ♟️ Constants

/**
 * Every example, in the order the package README lists them.
 *
 * Named here rather than derived from a numeric filename prefix: each example
 * is a directory a reader can open on its own, and its name is what the guides
 * link to. The order is a reading order, and this is the one place it is
 * written down.
 */
export const EXAMPLE_ORDER = [
  "graph-levels",
  "neighborhood-scope",
  "ambient-modules",
  "preview-mode",
  "container-rooting",
  "typescript-resolution",
  "python-scanner",
  "configuration-resolution",
  "export-targets",
  "markdown-modes",
  "auto-created-sections",
  "check-and-write",
  "refusals",
  "json-exports",
  "workspace-drift",
] as const;

// 📇 Collecting

/** Collects every example document, in the order the guides read them. */
export async function collectDocuments(): Promise<ExampleDocument[]> {
  return orderDocuments([
    ...(await buildGraphLevelDocuments()),
    ...buildNxDocuments(),
    ...(await buildNestjsDocuments()),
    ...buildTypescriptDocuments(),
    ...buildPythonDocuments(),
    ...(await buildConfigurationDocuments()),
    ...(await buildDeliveryDocuments()),
    ...buildAnchorDocuments(),
  ]);
}

/**
 * Puts the built documents into reading order, refusing any disagreement.
 *
 * A document whose `id` is missing from `EXAMPLE_ORDER` would otherwise be
 * silently dropped from the run — rendered nowhere, checked by nothing, and
 * invisible until a reader followed a link that was never written.
 */
export function orderDocuments(
  documents: ExampleDocument[],
): ExampleDocument[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const ordered = EXAMPLE_ORDER.map((id) => byId.get(id)).filter(
    (document) => document !== undefined,
  );

  if (ordered.length !== documents.length) {
    throw new Error("EXAMPLE_ORDER and the built documents disagree.");
  }

  return ordered;
}
