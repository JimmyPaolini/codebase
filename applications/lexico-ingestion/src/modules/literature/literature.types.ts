// 🏷️ Types

import type { Author, Text } from "@codebase/lexico-entities";
import type { PhrasingContent } from "mdast";

/**
 * Inputs required to ingest one markdown text into the literature entity graph.
 */
export interface IngestTextArguments {
  author: Author;
  parentText: Text | undefined;
  textPath: string;
  textSlugName: string;
  title: string;
}

/**
 * Discovered markdown file metadata collected from `data/library`.
 */
export interface LibraryEntry {
  authorSlug: string;
  fullPath: string;
  pathParts: string[];
  provider: string;
  textSlug: string;
  title: string;
}

/**
 * Optional CLI filters that scope literature ingestion.
 */
export interface LiteratureCommandOptions {
  author?: null | string;
  provider?: null | string;
  text?: null | string;
}

/**
 * Parsed line label and associated inline markdown nodes.
 */
export interface ParsedLabelResult {
  label: string;
  lineNodes: PhrasingContent[];
}
