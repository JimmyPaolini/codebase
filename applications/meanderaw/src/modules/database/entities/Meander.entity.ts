import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { MEANDER_FAMILIES } from "../../classification/classification.constants";
import { MEANDER_PROVENANCES } from "../database.constants";

import type { NumericCharacteristicRecord } from "../../characteristics/characteristics.types";
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
export class Meander implements NumericCharacteristicRecord {
  @Column({ default: 0, type: "int" })
  aEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  aInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  aLetterCount!: number;

  @Column({ default: 0, type: "int" })
  aoEastHanziCount!: number;

  @Column({ default: 0, type: "int" })
  aoHanziCount!: number;

  @Column({ default: 0, type: "int" })
  aoInvertedHanziCount!: number;

  @Column({ default: 0, type: "int" })
  aoWestHanziCount!: number;

  @Column({ default: 0, type: "int" })
  aWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  bettiNumber0Count!: number;

  @Column({ default: 0, type: "int" })
  bettiNumber1Count!: number;

  @Column({ default: 0, type: "int" })
  bLetterCount!: number;

  @Column({ default: 0, type: "int" })
  bottomBorderTouchCount!: number;

  @Column({ default: 0, type: "int" })
  bSidewaysLetterCount!: number;

  /**
   * Every boolean Characteristic that holds, in `BOOLEAN_CHARACTERISTIC_KEYS`
   * order, then `"isReducible"` when the filed Code is a whole number of
   * repeats of a narrower unit. Each numeric Characteristic has its own
   * column instead, named exactly its key, which `implements` holds complete.
   */
  @Column({ type: "simple-array" })
  characteristics!: string[];

  @Column({ default: 0, type: "int" })
  cLetterCount!: number;

  @Column({ type: "text" })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

  @Column({ default: 0, type: "int" })
  cornerCount!: number;

  @Column({ default: 0, type: "int" })
  crossCount!: number;

  @Column({ default: 0, type: "int" })
  cWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  daletEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  daletInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  daletLetterCount!: number;

  @Column({ default: 0, type: "int" })
  daletWestLetterCount!: number;

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
  eDownLetterCount!: number;

  @Column({ default: 0, type: "int" })
  eLetterCount!: number;

  @Column({ default: 0, type: "int" })
  embeddedUCount!: number;

  @Column({ default: 0, type: "int" })
  eUpLetterCount!: number;

  @Column({ default: 0, type: "int" })
  eWestLetterCount!: number;

  @Column({ enum: MEANDER_FAMILIES, type: "simple-enum" })
  family!: MeanderFamily;

  @Column({ default: 0, type: "int" })
  fDownLetterCount!: number;

  @Column({ default: 0, type: "int" })
  fLetterCount!: number;

  @Column({ default: 0, type: "int" })
  forkCount!: number;

  @Column({ default: 0, type: "int" })
  freeEndCount!: number;

  @Column({ default: 0, type: "int" })
  fUpLetterCount!: number;

  @Column({ default: 0, type: "int" })
  fWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  ganHanziCount!: number;

  @Column({ default: 0, type: "int" })
  hLetterCount!: number;

  @Column({ default: 0, type: "int" })
  horizontalRectangleCount!: number;

  @Column({ default: 0, type: "int" })
  hSidewaysLetterCount!: number;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0, type: "int" })
  iLetterCount!: number;

  @Column({ default: 0, type: "int" })
  inflectionCount!: number;

  @Column({ default: 0, type: "int" })
  inkPointCount!: number;

  @Column({ default: 0, type: "int" })
  iSidewaysLetterCount!: number;

  @Column({ default: 0, type: "int" })
  jiaHanziCount!: number;

  @Column({ default: 0, type: "int" })
  jingHanziCount!: number;

  @Column({ default: 0, type: "int" })
  kieukEastHangulCount!: number;

  @Column({ default: 0, type: "int" })
  kieukHangulCount!: number;

  @Column({ default: 0, type: "int" })
  kieukInvertedHangulCount!: number;

  @Column({ default: 0, type: "int" })
  kieukWestHangulCount!: number;

  @Column({ default: 0, type: "int" })
  lamedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  lamedSidewaysLetterCount!: number;

  @Column({ type: "text" })
  lattice!: string;

  @Column({ default: 0, type: "int" })
  lDownLetterCount!: number;

  @Column({ default: 0, type: "int" })
  lLetterCount!: number;

  @Column({ default: 0, type: "int" })
  longestHorizontalRunLength!: number;

  @Column({ default: 0, type: "int" })
  longestVerticalRunLength!: number;

  @Column({ default: 0, type: "int" })
  lUpLetterCount!: number;

  @Column({ default: 0, type: "int" })
  lWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  maxMonotonicTurnLength!: number;

  @Column({ default: 0, type: "int" })
  mEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  mLetterCount!: number;

  @Column({ default: 0, type: "int" })
  muHanziCount!: number;

  @Column({ default: 0, type: "int" })
  mWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  nLetterCount!: number;

  @Column({ default: 0, type: "int" })
  northEastCornerCount!: number;

  @Column({ default: 0, type: "int" })
  northEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  northForkCount!: number;

  @Column({ default: 0, type: "int" })
  northWestCornerCount!: number;

  @Column({ default: 0, type: "int" })
  nSidewaysLetterCount!: number;

  @Column({ default: 0, type: "int" })
  oLetterCount!: number;

  @Column({ default: 0, type: "int" })
  phiLetterCount!: number;

  @Column({ default: 0, type: "int" })
  pieupHangulCount!: number;

  @Column({ default: 0, type: "int" })
  pieupSidewaysHangulCount!: number;

  @Column({ enum: MEANDER_PROVENANCES, type: "simple-enum" })
  provenance!: "enumerated" | "hardcoded";

  @Column({ default: 0, type: "int" })
  psiEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  psiInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  psiLetterCount!: number;

  @Column({ default: 0, type: "int" })
  psiWestLetterCount!: number;

  @Column({ default: 1, type: "int" })
  repeats!: number;

  @Column({ default: 0, type: "int" })
  rhoEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  rhoInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  rhoLetterCount!: number;

  @Column({ default: 0, type: "int" })
  rhoWestLetterCount!: number;

  @Column({ type: "int" })
  rows!: number;

  @Column({ default: 0, type: "int" })
  shangHanziCount!: number;

  @Column({ default: 0, type: "int" })
  shenHanziCount!: number;

  @Column({ default: 0, type: "int" })
  sLetterCount!: number;

  @Column({ default: 0, type: "int" })
  southEastCornerCount!: number;

  @Column({ default: 0, type: "int" })
  southEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  southForkCount!: number;

  @Column({ default: 0, type: "int" })
  southWestCornerCount!: number;

  @Column({ default: 0, type: "int" })
  sSidewaysLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tavEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tavInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tavLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tavWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tianHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tightestTurnCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingComponentDeltaCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingCount!: number;

  @Column({ default: 0, type: "int" })
  tileCrossingCycleCount!: number;

  @Column({ default: 0, type: "int" })
  tLetterCount!: number;

  @Column({ default: 0, type: "int" })
  topBorderTouchCount!: number;

  @Column({ default: 0, type: "int" })
  totalTurnCount!: number;

  @Column({ default: 0, type: "int" })
  tuEastHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tuHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tuInvertedHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tUpLetterCount!: number;

  @Column({ default: 0, type: "int" })
  tuSoilHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tuWestHanziCount!: number;

  @Column({ default: 0, type: "int" })
  tWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  uInvertedLetterCount!: number;

  @Column({ default: 0, type: "int" })
  uLetterCount!: number;

  @Column({ default: 0, type: "int" })
  verticalRectangleCount!: number;

  @Column({ default: 0, type: "int" })
  wangHanziCount!: number;

  @Column({ default: 0, type: "int" })
  wangSidewaysHanziCount!: number;

  @Column({ default: 0, type: "int" })
  westEdgeCount!: number;

  @Column({ default: 0, type: "int" })
  westForkCount!: number;

  @Column({ default: 0, type: "int" })
  wLetterCount!: number;

  @Column({ default: 0, type: "int" })
  xLetterCount!: number;

  @Column({ default: 0, type: "int" })
  yaHangulCount!: number;

  @Column({ default: 0, type: "int" })
  yEastLetterCount!: number;

  @Column({ default: 0, type: "int" })
  yeoHangulCount!: number;

  @Column({ default: 0, type: "int" })
  yLetterCount!: number;

  @Column({ default: 0, type: "int" })
  yoHangulCount!: number;

  @Column({ default: 0, type: "int" })
  youHanziCount!: number;

  @Column({ default: 0, type: "int" })
  yuEastKatakanaCount!: number;

  @Column({ default: 0, type: "int" })
  yuHangulCount!: number;

  @Column({ default: 0, type: "int" })
  yuInvertedKatakanaCount!: number;

  @Column({ default: 0, type: "int" })
  yuKatakanaCount!: number;

  @Column({ default: 0, type: "int" })
  yUpLetterCount!: number;

  @Column({ default: 0, type: "int" })
  yuWestKatakanaCount!: number;

  @Column({ default: 0, type: "int" })
  yWestLetterCount!: number;

  @Column({ default: 0, type: "int" })
  zLetterCount!: number;

  @Column({ default: 0, type: "int" })
  zSidewaysLetterCount!: number;
}
