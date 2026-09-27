import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { MEANDER_FAMILIES } from "../../classification/classification.constants";
import { MEANDER_PROVENANCES } from "../database.constants";

import type {
  ColumnCharacteristicRecord,
  GlyphCounts,
} from "../../characteristics/characteristics.types";
import type { MeanderFamily } from "../../classification/classification.types";

/**
 * One row of the committed `output/meanders.sqlite` database: a single
 * meander addressed by its Code, decoded and rendered by the generic,
 * family-agnostic pipeline.
 *
 * `code` is unbounded text, because several families' full Codes outgrow
 * the 255-byte filesystem path component a file per Code once needed.
 *
 * A meander's identity is its lattice address: the Code together with its
 * `rows` and `columns`. `identify` names a tile by its points, not by its
 * shape, so the same four characters can be two different drawings.
 *
 * `provenance` says whether the enumerator found the row or it was ingested
 * from the historical corpus, which is also how a Code named at the command
 * line is recorded. `family` is `ClassificationService`'s verdict for an
 * Enumerated row and the filed family for a Hardcoded one.
 */
@Entity({ name: "meanders" })
@Index(["code"], { unique: true })
export class Meander implements ColumnCharacteristicRecord {
  @Column({ default: 0, type: "int" })
  bettiNumber0Count!: number;

  @Column({ default: 0, type: "int" })
  bettiNumber1Count!: number;

  @Column({ default: 0, type: "int" })
  bottomBorderTouchCount!: number;

  /**
   * Every boolean Characteristic that holds, in `BOOLEAN_CHARACTERISTIC_KEYS`
   * order, then `"isReducible"` when the filed Code is a whole number of
   * repeats of a narrower unit. Each numeric Characteristic but a letter has
   * its own column instead, named exactly its key, which `implements` holds
   * complete; the letters share {@link glyphs}.
   */
  @Column({ type: "simple-array" })
  characteristics!: string[];

  @Column({ type: "text" })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

  @Column({ default: 0, type: "int" })
  cornerCount!: number;

  @Column({ default: 0, type: "int" })
  crossCount!: number;

  @Column({ default: 0, type: "float" })
  density!: number;

  @Column({ default: 0, type: "int" })
  dotCount!: number;

  @Column({ default: 0, type: "int" })
  doubleHorizontalEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  doubleVerticalEdgeCount!: number;

  @Column({ type: "text" })
  drawingHash!: string;

  @Column({ default: 0, type: "int" })
  eastEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  eastForkCount!: number;

  @Column({ default: 0, type: "int" })
  edgeCount!: number;

  @Column({ default: 0, type: "int" })
  embeddedUCount!: number;

  @Column({ enum: MEANDER_FAMILIES, type: "simple-enum" })
  family!: MeanderFamily;

  @Column({ default: 0, type: "int" })
  forkCount!: number;

  @Column({ default: 0, type: "int" })
  freeEndCount!: number;

  /**
   * Every letter glyph count the meander has, keyed by its characteristic
   * key and holding only nonzero counts, as one JSON object: see
   * {@link GlyphCounts}. Letters live here rather than in a column each
   * because a full orientation set outnumbers the 2,000 columns one SQLite
   * table holds, and because one JSON column measured about three times
   * faster to write and a quarter the size of a 1:1 table per script, with
   * a single-letter filter a tie. Being keyed rather than declared, it takes
   * a new or renamed letter with no schema change. A raw SQL reader filtering
   * on zero or less than must read `COALESCE(json_extract(glyphs, '$.key'), 0)`,
   * since a missing letter extracts as NULL.
   */
  @Column({ type: "simple-json" })
  glyphs!: GlyphCounts;

  @Column({ default: 0, type: "int" })
  horizontalRectangleCount!: number;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0, type: "int" })
  inflectionCount!: number;

  @Column({ default: 0, type: "int" })
  inkPointCount!: number;

  @Column({ type: "text" })
  lattice!: string;

  @Column({ default: 0, type: "int" })
  longestHorizontalRunLength!: number;

  @Column({ default: 0, type: "int" })
  longestVerticalRunLength!: number;

  @Column({ default: 0, type: "int" })
  maxMonotonicTurnLength!: number;

  @Column({ default: 0, type: "int" })
  northEastCornerCount!: number;

  @Column({ default: 0, type: "int" })
  northEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  northForkCount!: number;

  @Column({ default: 0, type: "int" })
  northWestCornerCount!: number;

  @Column({ enum: MEANDER_PROVENANCES, type: "simple-enum" })
  provenance!: "enumerated" | "hardcoded";

  @Column({ default: 1, type: "int" })
  repeats!: number;

  @Column({ type: "int" })
  rows!: number;

  @Column({ default: 0, type: "int" })
  southEastCornerCount!: number;

  @Column({ default: 0, type: "int" })
  southEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  southForkCount!: number;

  @Column({ default: 0, type: "int" })
  southWestCornerCount!: number;

  @Column({ default: 0, type: "int" })
  tightestTurnCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingComponentDeltaCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingCycleCount!: number;

  @Column({ default: 0, type: "int" })
  topBorderTouchCount!: number;

  @Column({ default: 0, type: "int" })
  totalTurnCount!: number;

  @Column({ default: 0, type: "int" })
  verticalRectangleCount!: number;

  @Column({ default: 0, type: "int" })
  westEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  westForkCount!: number;
}
