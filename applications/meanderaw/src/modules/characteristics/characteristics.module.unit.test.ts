import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  BOOLEAN_CHARACTERISTIC_KEY_SET,
  CHARACTERISTIC_KEYS,
} from "./characteristics.constants";
import { CharacteristicsModule } from "./characteristics.module";
import { IsArcadeCharacteristicService } from "./compound/family/is-arcade-characteristic.service";
import { IsBarsCharacteristicService } from "./compound/family/is-bars-characteristic.service";
import { IsBoxesCharacteristicService } from "./compound/family/is-boxes-characteristic.service";
import { IsChainCharacteristicService } from "./compound/family/is-chain-characteristic.service";
import { IsClaspsCharacteristicService } from "./compound/family/is-clasps-characteristic.service";
import { IsCombCharacteristicService } from "./compound/family/is-comb-characteristic.service";
import { IsCrossCharacteristicService } from "./compound/family/is-cross-characteristic.service";
import { IsDotsCharacteristicService } from "./compound/family/is-dots-characteristic.service";
import { IsDoubleChainCharacteristicService } from "./compound/family/is-double-chain-characteristic.service";
import { IsForkCharacteristicService } from "./compound/family/is-fork-characteristic.service";
import { IsLinesCharacteristicService } from "./compound/family/is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./compound/family/is-mesh-characteristic.service";
import { IsParallelCharacteristicService } from "./compound/family/is-parallel-characteristic.service";
import { IsPureTreeCharacteristicService } from "./compound/family/is-pure-tree-characteristic.service";
import { IsSnakeCharacteristicService } from "./compound/family/is-snake-characteristic.service";
import { IsStippledCharacteristicService } from "./compound/family/is-stippled-characteristic.service";
import { IsSwirlCharacteristicService } from "./compound/family/is-swirl-characteristic.service";
import { IsWaterfallsCharacteristicService } from "./compound/family/is-waterfalls-characteristic.service";
import { IsWhirlCharacteristicService } from "./compound/family/is-whirl-characteristic.service";
import { IsClosedLoopCharacteristicService } from "./compound/structure/is-closed-loop-characteristic.service";
import { IsSingleArcCharacteristicService } from "./compound/structure/is-single-arc-characteristic.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "./path/end/ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "./path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingComponentDeltaCountCharacteristicService } from "./path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";
import { TileCrossingCountCharacteristicService } from "./path/tile-crossing/tile-crossing-count-characteristic.service";
import { TileCrossingCycleCountCharacteristicService } from "./path/tile-crossing/tile-crossing-cycle-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "./path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "./path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "./path/topology/free-end-count-characteristic.service";
import { BottomBorderTouchCountCharacteristicService } from "./path/turn/bottom-border-touch-count-characteristic.service";
import { InflectionCountCharacteristicService } from "./path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "./path/turn/max-monotonic-turn-length-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "./path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { TightestTurnCountCharacteristicService } from "./path/turn/tightest-turn-count-characteristic.service";
import { TopBorderTouchCountCharacteristicService } from "./path/turn/top-border-touch-count-characteristic.service";
import { TotalTurnCountCharacteristicService } from "./path/turn/total-turn-count-characteristic.service";
import { CornerCountCharacteristicService } from "./submatrix/corner/corner-count-characteristic.service";
import { NorthEastCornerCountCharacteristicService } from "./submatrix/corner/north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./submatrix/corner/north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./submatrix/corner/south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./submatrix/corner/south-west-corner-count-characteristic.service";
import { CrossCountCharacteristicService } from "./submatrix/cross/cross-count-characteristic.service";
import { EmbeddedUCountCharacteristicService } from "./submatrix/embedded/embedded-u-count-characteristic.service";
import { EastForkCountCharacteristicService } from "./submatrix/fork/east-fork-count-characteristic.service";
import { ForkCountCharacteristicService } from "./submatrix/fork/fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./submatrix/fork/north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./submatrix/fork/south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./submatrix/fork/west-fork-count-characteristic.service";
import { AEastLetterCountCharacteristicService } from "./submatrix/letter/a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./submatrix/letter/a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./submatrix/letter/a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./submatrix/letter/a-west-letter-count-characteristic.service";
import { AoEastHanziCountCharacteristicService } from "./submatrix/letter/ao-east-hanzi-count-characteristic.service";
import { AoHanziCountCharacteristicService } from "./submatrix/letter/ao-hanzi-count-characteristic.service";
import { AoInvertedHanziCountCharacteristicService } from "./submatrix/letter/ao-inverted-hanzi-count-characteristic.service";
import { AoWestHanziCountCharacteristicService } from "./submatrix/letter/ao-west-hanzi-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./submatrix/letter/b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./submatrix/letter/b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./submatrix/letter/c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./submatrix/letter/c-west-letter-count-characteristic.service";
import { DaletEastLetterCountCharacteristicService } from "./submatrix/letter/dalet-east-letter-count-characteristic.service";
import { DaletInvertedLetterCountCharacteristicService } from "./submatrix/letter/dalet-inverted-letter-count-characteristic.service";
import { DaletLetterCountCharacteristicService } from "./submatrix/letter/dalet-letter-count-characteristic.service";
import { DaletWestLetterCountCharacteristicService } from "./submatrix/letter/dalet-west-letter-count-characteristic.service";
import { EDownLetterCountCharacteristicService } from "./submatrix/letter/e-down-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./submatrix/letter/e-letter-count-characteristic.service";
import { EUpLetterCountCharacteristicService } from "./submatrix/letter/e-up-letter-count-characteristic.service";
import { EWestLetterCountCharacteristicService } from "./submatrix/letter/e-west-letter-count-characteristic.service";
import { FDownLetterCountCharacteristicService } from "./submatrix/letter/f-down-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./submatrix/letter/f-letter-count-characteristic.service";
import { FUpLetterCountCharacteristicService } from "./submatrix/letter/f-up-letter-count-characteristic.service";
import { FWestLetterCountCharacteristicService } from "./submatrix/letter/f-west-letter-count-characteristic.service";
import { GanHanziCountCharacteristicService } from "./submatrix/letter/gan-hanzi-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./submatrix/letter/h-letter-count-characteristic.service";
import { HSidewaysLetterCountCharacteristicService } from "./submatrix/letter/h-sideways-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./submatrix/letter/i-letter-count-characteristic.service";
import { ISidewaysLetterCountCharacteristicService } from "./submatrix/letter/i-sideways-letter-count-characteristic.service";
import { JiaHanziCountCharacteristicService } from "./submatrix/letter/jia-hanzi-count-characteristic.service";
import { JingHanziCountCharacteristicService } from "./submatrix/letter/jing-hanzi-count-characteristic.service";
import { KieukEastHangulCountCharacteristicService } from "./submatrix/letter/kieuk-east-hangul-count-characteristic.service";
import { KieukHangulCountCharacteristicService } from "./submatrix/letter/kieuk-hangul-count-characteristic.service";
import { KieukInvertedHangulCountCharacteristicService } from "./submatrix/letter/kieuk-inverted-hangul-count-characteristic.service";
import { KieukWestHangulCountCharacteristicService } from "./submatrix/letter/kieuk-west-hangul-count-characteristic.service";
import { LDownLetterCountCharacteristicService } from "./submatrix/letter/l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./submatrix/letter/l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./submatrix/letter/l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./submatrix/letter/l-west-letter-count-characteristic.service";
import { LamedLetterCountCharacteristicService } from "./submatrix/letter/lamed-letter-count-characteristic.service";
import { LamedSidewaysLetterCountCharacteristicService } from "./submatrix/letter/lamed-sideways-letter-count-characteristic.service";
import { MEastLetterCountCharacteristicService } from "./submatrix/letter/m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./submatrix/letter/m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./submatrix/letter/m-west-letter-count-characteristic.service";
import { MuHanziCountCharacteristicService } from "./submatrix/letter/mu-hanzi-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./submatrix/letter/n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./submatrix/letter/n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./submatrix/letter/o-letter-count-characteristic.service";
import { PhiLetterCountCharacteristicService } from "./submatrix/letter/phi-letter-count-characteristic.service";
import { PieupHangulCountCharacteristicService } from "./submatrix/letter/pieup-hangul-count-characteristic.service";
import { PieupSidewaysHangulCountCharacteristicService } from "./submatrix/letter/pieup-sideways-hangul-count-characteristic.service";
import { PsiEastLetterCountCharacteristicService } from "./submatrix/letter/psi-east-letter-count-characteristic.service";
import { PsiInvertedLetterCountCharacteristicService } from "./submatrix/letter/psi-inverted-letter-count-characteristic.service";
import { PsiLetterCountCharacteristicService } from "./submatrix/letter/psi-letter-count-characteristic.service";
import { PsiWestLetterCountCharacteristicService } from "./submatrix/letter/psi-west-letter-count-characteristic.service";
import { RhoEastLetterCountCharacteristicService } from "./submatrix/letter/rho-east-letter-count-characteristic.service";
import { RhoInvertedLetterCountCharacteristicService } from "./submatrix/letter/rho-inverted-letter-count-characteristic.service";
import { RhoLetterCountCharacteristicService } from "./submatrix/letter/rho-letter-count-characteristic.service";
import { RhoWestLetterCountCharacteristicService } from "./submatrix/letter/rho-west-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./submatrix/letter/s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./submatrix/letter/s-sideways-letter-count-characteristic.service";
import { ShangHanziCountCharacteristicService } from "./submatrix/letter/shang-hanzi-count-characteristic.service";
import { ShenHanziCountCharacteristicService } from "./submatrix/letter/shen-hanzi-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./submatrix/letter/t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./submatrix/letter/t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./submatrix/letter/t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./submatrix/letter/t-west-letter-count-characteristic.service";
import { TavEastLetterCountCharacteristicService } from "./submatrix/letter/tav-east-letter-count-characteristic.service";
import { TavInvertedLetterCountCharacteristicService } from "./submatrix/letter/tav-inverted-letter-count-characteristic.service";
import { TavLetterCountCharacteristicService } from "./submatrix/letter/tav-letter-count-characteristic.service";
import { TavWestLetterCountCharacteristicService } from "./submatrix/letter/tav-west-letter-count-characteristic.service";
import { TianHanziCountCharacteristicService } from "./submatrix/letter/tian-hanzi-count-characteristic.service";
import { TuEastHanziCountCharacteristicService } from "./submatrix/letter/tu-east-hanzi-count-characteristic.service";
import { TuHanziCountCharacteristicService } from "./submatrix/letter/tu-hanzi-count-characteristic.service";
import { TuInvertedHanziCountCharacteristicService } from "./submatrix/letter/tu-inverted-hanzi-count-characteristic.service";
import { TuSoilHanziCountCharacteristicService } from "./submatrix/letter/tu-soil-hanzi-count-characteristic.service";
import { TuWestHanziCountCharacteristicService } from "./submatrix/letter/tu-west-hanzi-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./submatrix/letter/u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./submatrix/letter/u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./submatrix/letter/w-letter-count-characteristic.service";
import { WangHanziCountCharacteristicService } from "./submatrix/letter/wang-hanzi-count-characteristic.service";
import { WangSidewaysHanziCountCharacteristicService } from "./submatrix/letter/wang-sideways-hanzi-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./submatrix/letter/x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./submatrix/letter/y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./submatrix/letter/y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./submatrix/letter/y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./submatrix/letter/y-west-letter-count-characteristic.service";
import { YaHangulCountCharacteristicService } from "./submatrix/letter/ya-hangul-count-characteristic.service";
import { YeoHangulCountCharacteristicService } from "./submatrix/letter/yeo-hangul-count-characteristic.service";
import { YoHangulCountCharacteristicService } from "./submatrix/letter/yo-hangul-count-characteristic.service";
import { YouHanziCountCharacteristicService } from "./submatrix/letter/you-hanzi-count-characteristic.service";
import { YuEastKatakanaCountCharacteristicService } from "./submatrix/letter/yu-east-katakana-count-characteristic.service";
import { YuHangulCountCharacteristicService } from "./submatrix/letter/yu-hangul-count-characteristic.service";
import { YuInvertedKatakanaCountCharacteristicService } from "./submatrix/letter/yu-inverted-katakana-count-characteristic.service";
import { YuKatakanaCountCharacteristicService } from "./submatrix/letter/yu-katakana-count-characteristic.service";
import { YuWestKatakanaCountCharacteristicService } from "./submatrix/letter/yu-west-katakana-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./submatrix/letter/z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./submatrix/letter/z-sideways-letter-count-characteristic.service";
import { DensityCharacteristicService } from "./submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "./submatrix/point/dot-count-characteristic.service";
import { DoubleHorizontalEdgeCountCharacteristicService } from "./submatrix/point/double-horizontal-edge-count-characteristic.service";
import { DoubleVerticalEdgeCountCharacteristicService } from "./submatrix/point/double-vertical-edge-count-characteristic.service";
import { EastEdgeCountCharacteristicService } from "./submatrix/point/east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "./submatrix/point/edge-count-characteristic.service";
import { InkPointCountCharacteristicService } from "./submatrix/point/ink-point-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "./submatrix/point/north-edge-count-characteristic.service";
import { SouthEdgeCountCharacteristicService } from "./submatrix/point/south-edge-count-characteristic.service";
import { WestEdgeCountCharacteristicService } from "./submatrix/point/west-edge-count-characteristic.service";
import { HorizontalRectangleCountCharacteristicService } from "./submatrix/rectangle/horizontal-rectangle-count-characteristic.service";
import { VerticalRectangleCountCharacteristicService } from "./submatrix/rectangle/vertical-rectangle-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "./submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "./submatrix/run/longest-vertical-run-length-characteristic.service";

import type {
  CharacteristicEvaluator,
  SubmatrixWindow,
} from "./characteristics.types";
import type { Type } from "@nestjs/common";

/** Every characteristic evaluator a consumer of `CharacteristicsModule` must be able to inject. */
const CHARACTERISTIC_SERVICES: readonly Type<CharacteristicEvaluator>[] = [
  YuKatakanaCountCharacteristicService,
  YuEastKatakanaCountCharacteristicService,
  YuInvertedKatakanaCountCharacteristicService,
  YuWestKatakanaCountCharacteristicService,
  TianHanziCountCharacteristicService,
  WangHanziCountCharacteristicService,
  WangSidewaysHanziCountCharacteristicService,
  TuHanziCountCharacteristicService,
  TuEastHanziCountCharacteristicService,
  TuInvertedHanziCountCharacteristicService,
  TuWestHanziCountCharacteristicService,
  AoHanziCountCharacteristicService,
  AoEastHanziCountCharacteristicService,
  AoInvertedHanziCountCharacteristicService,
  AoWestHanziCountCharacteristicService,
  PieupHangulCountCharacteristicService,
  PieupSidewaysHangulCountCharacteristicService,
  KieukHangulCountCharacteristicService,
  KieukEastHangulCountCharacteristicService,
  KieukInvertedHangulCountCharacteristicService,
  KieukWestHangulCountCharacteristicService,
  DaletLetterCountCharacteristicService,
  DaletEastLetterCountCharacteristicService,
  DaletInvertedLetterCountCharacteristicService,
  DaletWestLetterCountCharacteristicService,
  LamedLetterCountCharacteristicService,
  LamedSidewaysLetterCountCharacteristicService,
  TavLetterCountCharacteristicService,
  TavEastLetterCountCharacteristicService,
  TavInvertedLetterCountCharacteristicService,
  TavWestLetterCountCharacteristicService,
  PhiLetterCountCharacteristicService,
  PsiLetterCountCharacteristicService,
  PsiEastLetterCountCharacteristicService,
  PsiInvertedLetterCountCharacteristicService,
  PsiWestLetterCountCharacteristicService,
  RhoLetterCountCharacteristicService,
  RhoEastLetterCountCharacteristicService,
  RhoInvertedLetterCountCharacteristicService,
  RhoWestLetterCountCharacteristicService,
  YaHangulCountCharacteristicService,
  YeoHangulCountCharacteristicService,
  YoHangulCountCharacteristicService,
  YuHangulCountCharacteristicService,
  TuSoilHanziCountCharacteristicService,
  GanHanziCountCharacteristicService,
  ShangHanziCountCharacteristicService,
  MuHanziCountCharacteristicService,
  YouHanziCountCharacteristicService,
  JiaHanziCountCharacteristicService,
  ShenHanziCountCharacteristicService,
  JingHanziCountCharacteristicService,
  ZSidewaysLetterCountCharacteristicService,
  YWestLetterCountCharacteristicService,
  YUpLetterCountCharacteristicService,
  YEastLetterCountCharacteristicService,
  UInvertedLetterCountCharacteristicService,
  TWestLetterCountCharacteristicService,
  TUpLetterCountCharacteristicService,
  TEastLetterCountCharacteristicService,
  SSidewaysLetterCountCharacteristicService,
  NSidewaysLetterCountCharacteristicService,
  MWestLetterCountCharacteristicService,
  MEastLetterCountCharacteristicService,
  LWestLetterCountCharacteristicService,
  LUpLetterCountCharacteristicService,
  LDownLetterCountCharacteristicService,
  ISidewaysLetterCountCharacteristicService,
  HSidewaysLetterCountCharacteristicService,
  FWestLetterCountCharacteristicService,
  FUpLetterCountCharacteristicService,
  FDownLetterCountCharacteristicService,
  EWestLetterCountCharacteristicService,
  EUpLetterCountCharacteristicService,
  EDownLetterCountCharacteristicService,
  CWestLetterCountCharacteristicService,
  BSidewaysLetterCountCharacteristicService,
  AWestLetterCountCharacteristicService,
  AInvertedLetterCountCharacteristicService,
  AEastLetterCountCharacteristicService,
  ZLetterCountCharacteristicService,
  YLetterCountCharacteristicService,
  XLetterCountCharacteristicService,
  WLetterCountCharacteristicService,
  ULetterCountCharacteristicService,
  TLetterCountCharacteristicService,
  SLetterCountCharacteristicService,
  OLetterCountCharacteristicService,
  NLetterCountCharacteristicService,
  MLetterCountCharacteristicService,
  LLetterCountCharacteristicService,
  ILetterCountCharacteristicService,
  HLetterCountCharacteristicService,
  FLetterCountCharacteristicService,
  ELetterCountCharacteristicService,
  CLetterCountCharacteristicService,
  BLetterCountCharacteristicService,
  ALetterCountCharacteristicService,
  BettiNumber0CountCharacteristicService,
  BettiNumber1CountCharacteristicService,
  BottomBorderTouchCountCharacteristicService,
  CornerCountCharacteristicService,
  CrossCountCharacteristicService,
  DensityCharacteristicService,
  DotCountCharacteristicService,
  DoubleHorizontalEdgeCountCharacteristicService,
  DoubleVerticalEdgeCountCharacteristicService,
  EastEdgeCountCharacteristicService,
  EastForkCountCharacteristicService,
  EdgeCountCharacteristicService,
  EmbeddedUCountCharacteristicService,
  EndsAreLatticeNeighborsCharacteristicService,
  EndsOnBorderRulesCharacteristicService,
  ForkCountCharacteristicService,
  FreeEndCountCharacteristicService,
  HorizontalRectangleCountCharacteristicService,
  InflectionCountCharacteristicService,
  InkPointCountCharacteristicService,
  IsArcadeCharacteristicService,
  IsBarsCharacteristicService,
  IsBoxesCharacteristicService,
  IsChainCharacteristicService,
  IsClaspsCharacteristicService,
  IsClosedLoopCharacteristicService,
  IsCombCharacteristicService,
  IsCrossCharacteristicService,
  IsDotsCharacteristicService,
  IsDoubleChainCharacteristicService,
  IsForkCharacteristicService,
  IsLinesCharacteristicService,
  IsMeshCharacteristicService,
  IsParallelCharacteristicService,
  IsPureTreeCharacteristicService,
  IsSingleArcCharacteristicService,
  IsSnakeCharacteristicService,
  IsStippledCharacteristicService,
  IsSwirlCharacteristicService,
  IsWaterfallsCharacteristicService,
  IsWhirlCharacteristicService,
  LongestHorizontalRunLengthCharacteristicService,
  LongestVerticalRunLengthCharacteristicService,
  MaxMonotonicTurnLengthCharacteristicService,
  NorthEastCornerCountCharacteristicService,
  NorthEdgeCountCharacteristicService,
  NorthForkCountCharacteristicService,
  NorthWestCornerCountCharacteristicService,
  ReversesAtItsTightestTurnCharacteristicService,
  SouthEastCornerCountCharacteristicService,
  SouthEdgeCountCharacteristicService,
  SouthForkCountCharacteristicService,
  SouthWestCornerCountCharacteristicService,
  TightestTurnCountCharacteristicService,
  TileCrossingComponentDeltaCountCharacteristicService,
  TileCrossingCountCharacteristicService,
  TileCrossingCycleCountCharacteristicService,
  TopBorderTouchCountCharacteristicService,
  TotalTurnCountCharacteristicService,
  VerticalRectangleCountCharacteristicService,
  WestEdgeCountCharacteristicService,
  WestForkCountCharacteristicService,
];

/** A letter glyph's key — Latin, Greek, and Hebrew letters, katakana, hanzi, and hangul. */
const LETTER_GLYPH_KEY = /(?:Hangul|Hanzi|Katakana|Letter)Count$/u;

/**
 * The window, in lattice points, each submatrix evaluator other than a letter
 * glyph reads: 1×1 for a point scan or a sum of point scans, and the smallest
 * window for a variable-size scan. A letter glyph's window is checked against
 * its drawn fixture in the letter module's own test.
 */
const WINDOWS: Readonly<Record<string, SubmatrixWindow>> = {
  cornerCount: { columns: 1, rows: 1 },
  crossCount: { columns: 1, rows: 1 },
  density: { columns: 1, rows: 1 },
  dotCount: { columns: 1, rows: 1 },
  doubleHorizontalEdgeCount: { columns: 1, rows: 1 },
  doubleVerticalEdgeCount: { columns: 1, rows: 1 },
  eastEdgeCount: { columns: 1, rows: 1 },
  eastForkCount: { columns: 1, rows: 1 },
  edgeCount: { columns: 1, rows: 1 },
  embeddedUCount: { columns: 2, rows: 2 },
  forkCount: { columns: 1, rows: 1 },
  horizontalRectangleCount: { columns: 3, rows: 2, variable: true },
  inkPointCount: { columns: 1, rows: 1 },
  longestHorizontalRunLength: { columns: 2, rows: 1, variable: true },
  longestVerticalRunLength: { columns: 1, rows: 2, variable: true },
  northEastCornerCount: { columns: 1, rows: 1 },
  northEdgeCount: { columns: 1, rows: 1 },
  northForkCount: { columns: 1, rows: 1 },
  northWestCornerCount: { columns: 1, rows: 1 },
  southEastCornerCount: { columns: 1, rows: 1 },
  southEdgeCount: { columns: 1, rows: 1 },
  southForkCount: { columns: 1, rows: 1 },
  southWestCornerCount: { columns: 1, rows: 1 },
  verticalRectangleCount: { columns: 2, rows: 3, variable: true },
  westEdgeCount: { columns: 1, rows: 1 },
  westForkCount: { columns: 1, rows: 1 },
};

/** The token a consumer module gathers every evaluator under, through a factory whose `inject` list only resolves exported providers. */
const EVALUATORS = Symbol("EVALUATORS");

/** The metadata key a service's class name promises: `DotCountCharacteristicService` fills `dotCount`. */
function expectedKey(service: Type<CharacteristicEvaluator>): string {
  const stem = service.name.replace(/CharacteristicService$/u, "");

  return stem.charAt(0).toLowerCase() + stem.slice(1);
}

describe(CharacteristicsModule, () => {
  let evaluators: readonly CharacteristicEvaluator[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
      providers: [
        {
          inject: [...CHARACTERISTIC_SERVICES],
          provide: EVALUATORS,
          useFactory: (
            ...injected: CharacteristicEvaluator[]
          ): CharacteristicEvaluator[] => injected,
        },
      ],
    }).compile();

    evaluators = module.get<CharacteristicEvaluator[]>(EVALUATORS);
  });

  describe.each(
    CHARACTERISTIC_SERVICES.map((service, index) => ({
      index,
      name: service.name,
      service,
    })),
  )("$name", ({ index, service }) => {
    it("is exported to a consumer that imports the module", () => {
      expect(evaluators[index]).toBeInstanceOf(service);
    });

    it("names its metadata key after its class", () => {
      expect(evaluators[index]?.metadata.key).toBe(expectedKey(service));
    });

    it("describes itself with a display name, a description, and a known category", () => {
      const metadata = evaluators[index]?.metadata;

      expect(metadata?.name).not.toBe("");
      expect(metadata?.description).not.toBe("");
      expect(["compound", "path", "submatrix"]).toContain(metadata?.category);
    });

    it("declares a submatrix window exactly when its category is submatrix", () => {
      const metadata = evaluators[index]?.metadata;

      expect(metadata?.submatrix !== undefined).toBe(
        metadata?.category === "submatrix",
      );
    });
  });

  it("gives every characteristic evaluator a unique metadata key", () => {
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers exactly the characteristic key list, in both directions", () => {
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(keys.toSorted()).toStrictEqual([...CHARACTERISTIC_KEYS].toSorted());
  });

  it("sizes every declared submatrix window in whole lattice points", () => {
    const windows = evaluators.flatMap(({ metadata }) =>
      metadata.submatrix === undefined ? [] : [metadata.submatrix],
    );

    expect(
      windows.filter(
        ({ columns, rows }) =>
          !Number.isInteger(columns) ||
          !Number.isInteger(rows) ||
          columns < 1 ||
          rows < 1,
      ),
    ).toStrictEqual([]);
  });

  it("declares the window each non-letter submatrix evaluator reads", () => {
    const declared = Object.fromEntries(
      evaluators
        .filter(({ metadata }) => !LETTER_GLYPH_KEY.test(metadata.key))
        .flatMap(({ metadata }) =>
          metadata.submatrix === undefined
            ? []
            : [[metadata.key, metadata.submatrix]],
        ),
    );

    expect(declared).toStrictEqual(WINDOWS);
  });

  it("declares the value type each key's list promises", () => {
    const declared = evaluators.map(({ metadata }) => [
      metadata.key,
      metadata.valueType,
    ]);
    const promised = evaluators.map(({ metadata }) => [
      metadata.key,
      BOOLEAN_CHARACTERISTIC_KEY_SET.has(metadata.key) ? "boolean" : "number",
    ]);

    expect(declared).toStrictEqual(promised);
  });
});
