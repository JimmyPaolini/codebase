// 🏷️ Types

import type { MeanderType } from "../meander-generation/meander-generation.types";

/** Parsed `generate` command options, ready to pass to the generation service. */
export interface GenerateCommandOptions {
  outputDirectory: string;
  repeatCount: number;
  rows: number;
  type: MeanderType;
}
