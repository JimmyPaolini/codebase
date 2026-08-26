import { buildAnchorDocuments } from "./anchor-placement";
import { buildConfigurationDocuments } from "./configuration";
import { buildDeliveryDocuments } from "./export-delivery";
import { buildGraphLevelDocuments } from "./graph-levels";
import { buildNestjsDocuments } from "./nestjs-graphs";
import { buildNxDocuments } from "./nx-graphs";
import { buildPythonDocuments } from "./python-imports";
import { buildTypescriptDocuments } from "./typescript-imports";

import type { ExampleDocument } from "./types";

/** Collects every example document, in the order the guides read them. */
export async function collectDocuments(): Promise<ExampleDocument[]> {
  return [
    ...(await buildGraphLevelDocuments()),
    ...buildNxDocuments(),
    ...(await buildNestjsDocuments()),
    ...buildTypescriptDocuments(),
    ...buildPythonDocuments(),
    ...(await buildConfigurationDocuments()),
    ...buildDeliveryDocuments(),
    ...buildAnchorDocuments(),
  ].toSorted((first, second) => first.id.localeCompare(second.id));
}
