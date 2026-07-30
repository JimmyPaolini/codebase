import type { Author } from "@codebase/lexico-entities";

// 🏷️ Types

/**
 * Optional CLI filters applied before invoking library source providers.
 */
export interface LibraryCommandOptions {
  author?: null | string;
  provider?: null | string;
  text?: null | string;
}

/**
 * Provider contract for ingesting one source corpus into author/text entities.
 */
export interface LibrarySourceProvider {
  ingest: (options?: { author?: string; text?: string }) => Promise<Author[]>;
  name: string;
}
