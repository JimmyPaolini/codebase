// 🏷️ Types

/** Options accepted by the list command. */
export interface ListCommandOptions {
  config?: string;
  json?: boolean;
}

/**
 * One generator in the machine-readable listing.
 *
 * Every field is always present, with an absent alias list or description
 * rendered as empty rather than omitted, so a parser never has to branch on
 * whether a key exists.
 */
export interface ListedGenerator {
  aliases: string[];
  description: string;
  name: string;
  templatePath: string;
}
