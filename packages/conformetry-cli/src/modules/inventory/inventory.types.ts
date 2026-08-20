// 🏷️ Types

/** One instance found on disk, paired with the templates that explain it. */
export interface InventoriedInstance {
  /** Path relative to the working directory, usable as a glob elsewhere. */
  path: string;
  /** Templates that explain this instance, best fit first. */
  templates: InventoriedMatch[];
}

/** How well one template and one instance fit each other. */
export interface InventoriedMatch {
  matchedFileCount: number;
  matchRatio: number;
  /** The other side of the pairing — a template name or an instance path. */
  name: string;
  templateFileCount: number;
}

/** One template a generator declares, paired with the instances it explains. */
export interface InventoriedTemplate {
  aliases: string[];
  description: string;
  /** Instances this template explains, empty when nothing was matched. */
  instances: InventoriedMatch[];
  name: string;
  templatePath: string;
}

/** Arguments for taking an inventory of templates and instances. */
export interface ResolveInventoryArguments {
  configurationPath: string;
  /** Globs narrowing which instances are considered; the configured ones when absent. */
  instancePatterns?: string[];
  /** Template names narrowing which templates are considered; all when absent. */
  templateNames?: string[];
  workingDirectory: string;
}
