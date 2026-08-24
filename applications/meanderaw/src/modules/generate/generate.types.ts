// 🏷️ Types

import type {
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";

/** Parsed `generate` command options, ready to pass to the generation service. */
export interface GenerateCommandOptions {
  modifier?: Modifier;
  outputDirectory: string;
  repeatCount: number;
  rows: number;
  type: MeanderType;
}
