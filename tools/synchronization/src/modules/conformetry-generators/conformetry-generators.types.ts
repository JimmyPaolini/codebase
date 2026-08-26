// 🏷️ Types

/** Metadata for a conformetry generator rendered in the AGENTS.md table. */
export interface ConformetryGeneratorMetadata {
  aliases: string[];
  description: string;
  name: string;
}

/** A file the conformetry generators table is synced into. */
export interface ConformetryGeneratorsTargetFile {
  includeAlias: boolean;
  path: string;
}
