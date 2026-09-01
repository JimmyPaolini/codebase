// 🏷️ Types

import type {
  DotShape,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";

/**
 * Parsed `generate` command options, ready to pass to the generation
 * service. `modifier` and `period` are raw, individually-parsed `@Option`
 * values — nest-commander derives each option's key from its own long flag
 * name (`--modifier`, `--period`), so they can't be pre-combined at parse
 * time. `GenerateCommand.buildModifier` combines them into the final
 * {@link Modifier} shape once every option has been parsed, since a
 * modifier's own required parameters (like `alternated`'s `period`, or
 * `dot`'s `shape`) are parsed by a separate `@Option` method with no access
 * to `modifier`.
 *
 * `subFamily` needs no such combining: it names a region of the family's
 * unit space on its own, and it is mutually exclusive with `modifier`,
 * which the generation service enforces.
 */
export interface GenerateCommandOptions {
  modifier?: Modifier["name"];
  outputDirectory: string;
  period?: number;
  repeatCount: number;
  rows: number;
  shape?: DotShape;
  subFamily?: MosaicSubFamily;
  type: MeanderType;
}
