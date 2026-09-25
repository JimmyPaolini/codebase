import { Injectable } from "@nestjs/common";

import { STRUCTURAL_MINIMUM_ROWS } from "./classification.constants";

import type { Characteristics } from "../characteristics/characteristics.types";
import type {
  MeanderFamily,
  MeanderFamilyRule,
  MeanderShape,
  MeanderStructure,
} from "./classification.types";

/**
 * Decides which single family a meander belongs to from its measured
 * Characteristics and shape, applying strict hierarchical precedence:
 * `parallel` -> `cross` -> `arcade` -> `comb` -> `fork` -> `tree` -> `boxes` -> `chain` -> `double-chain` -> `waterfalls` -> `whirl` -> `swirl` -> `clasps` -> `snake` -> `stipple` -> `unclassified`.
 */
@Injectable()
export class ClassificationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a repeat's ink is one open arc with two ends and no junctions. */
  private isArc(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      components === 1 &&
      cycles === 0 &&
      freeEnds === 2
    );
  }

  /** Whether a repeat's ink is a bundle of parallel strands. */
  private isBundle(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds, pitch } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      cycles === 0 &&
      pitch % 2 === 0 &&
      components === pitch / 2 + 1 &&
      freeEnds === 2 * components &&
      this.reachesMinimumRows(structure, "parallel")
    );
  }

  /** Whether a repeat's ink matches the single-strand chain structure. */
  private isChain(structure: MeanderStructure): boolean {
    const {
      crossesTheSeam,
      density,
      dotCount,
      endsOnBorderRules,
      longestHorizontalRun,
      longestVerticalRun,
      pitch,
      reversesAtItsTightestTurn,
    } = structure.characteristics;

    return (
      this.isArc(structure) &&
      pitch === structure.rows &&
      crossesTheSeam &&
      reversesAtItsTightestTurn &&
      !endsOnBorderRules &&
      longestHorizontalRun === structure.columns &&
      longestVerticalRun === structure.rows - 1 &&
      density === 1 &&
      dotCount === 0 &&
      this.reachesMinimumRows(structure, "chain")
    );
  }

  /** Whether a repeat's ink matches the single- or double-motif clasp structure. */
  private isClasps(structure: MeanderStructure): boolean {
    const {
      components,
      crossesTheSeam,
      cycles,
      density,
      dotCount,
      freeEnds,
      longestHorizontalRun,
      longestVerticalRun,
      pitch,
      reversesAtItsTightestTurn,
    } = structure.characteristics;

    if (
      !this.isJunctionFree(structure) ||
      crossesTheSeam ||
      cycles !== 0 ||
      density !== 1 ||
      dotCount !== 0 ||
      !reversesAtItsTightestTurn ||
      longestHorizontalRun !== structure.rows - 1 ||
      longestVerticalRun !== structure.rows - 1 ||
      !this.reachesMinimumRows(structure, "clasps")
    ) {
      return false;
    }

    const isSingleClasp =
      components === 2 && freeEnds === 4 && pitch === structure.rows + 1;

    const isDoubleClasp =
      components === 4 && freeEnds === 8 && pitch === 2 * structure.rows + 2;

    return isSingleClasp || isDoubleClasp;
  }

  /** Whether a repeat's ink is one closed loop with no junctions and no free ends. */
  private isClosedLoop(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      components === 1 &&
      cycles === 1 &&
      freeEnds === 0
    );
  }

  /** Whether a repeat's ink matches the two-strand double-chain structure. */
  private isDoubleChain(structure: MeanderStructure): boolean {
    const {
      components,
      crossesTheSeam,
      cycles,
      density,
      dotCount,
      endsOnBorderRules,
      freeEnds,
      longestHorizontalRun,
      longestVerticalRun,
      pitch,
      reversesAtItsTightestTurn,
    } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      components === 2 &&
      cycles === 0 &&
      freeEnds === 4 &&
      pitch === 2 * structure.rows - 2 &&
      crossesTheSeam &&
      reversesAtItsTightestTurn &&
      !endsOnBorderRules &&
      longestHorizontalRun === structure.columns - 1 &&
      longestVerticalRun === structure.rows - 2 &&
      density === 1 &&
      dotCount === 0 &&
      this.reachesMinimumRows(structure, "double-chain")
    );
  }

  /** Whether a repeat's ink is free of T-junctions and X-junctions. */
  private isJunctionFree(structure: MeanderStructure): boolean {
    const { inkTJunctions, inkXJunctions } = structure.characteristics;

    return inkTJunctions === 0 && inkXJunctions === 0;
  }

  /** Whether a repeat's ink matches the single- or double-strand swirl structure. */
  private isSwirl(structure: MeanderStructure): boolean {
    const {
      components,
      crossesTheSeam,
      cycles,
      density,
      dotCount,
      endsOnBorderRules,
      freeEnds,
      longestHorizontalRun,
      longestVerticalRun,
      pitch,
    } = structure.characteristics;

    if (
      !this.isJunctionFree(structure) ||
      crossesTheSeam ||
      cycles !== 0 ||
      density !== 1 ||
      dotCount !== 0 ||
      endsOnBorderRules ||
      longestHorizontalRun !== structure.rows - 1 ||
      longestVerticalRun !== structure.rows - 1 ||
      !this.reachesMinimumRows(structure, "swirl")
    ) {
      return false;
    }

    const isSingleSwirl =
      components === 1 && freeEnds === 2 && pitch === 2 * structure.rows - 1;

    const isDoubleSwirl =
      components === 2 && freeEnds === 4 && pitch === 4 * structure.rows - 2;

    return isSingleSwirl || isDoubleSwirl;
  }

  /** Whether a repeat's ink is a downward zig-zagging waterfall across the seam with no isolated dots. */
  private isWaterfalls(structure: MeanderStructure): boolean {
    const { characteristics } = structure;

    return (
      this.isJunctionFree(structure) &&
      characteristics.dotCount === 0 &&
      characteristics.cycles === 0 &&
      characteristics.freeEnds === 2 * characteristics.components &&
      characteristics.crossesTheSeam &&
      characteristics.endsOnBorderRules &&
      !characteristics.endsAreLatticeNeighbors &&
      characteristics.embeddedUCount === 0 &&
      characteristics.longestVerticalRun === 1 &&
      this.reachesMinimumRows(structure, "waterfalls")
    );
  }

  /** Whether a repeat's ink matches the single- or double-strand whirl structure. */
  private isWhirl(structure: MeanderStructure): boolean {
    const {
      components,
      crossesTheSeam,
      cycles,
      density,
      dotCount,
      freeEnds,
      longestHorizontalRun,
      longestVerticalRun,
      pitch,
    } = structure.characteristics;

    if (
      !this.isJunctionFree(structure) ||
      crossesTheSeam ||
      cycles !== 0 ||
      density !== 1 ||
      dotCount !== 0 ||
      longestHorizontalRun !== structure.rows - 1 ||
      longestVerticalRun !== structure.rows - 1 ||
      !this.reachesMinimumRows(structure, "whirl")
    ) {
      return false;
    }

    const isSingleWhirl =
      components === 1 &&
      freeEnds === 2 &&
      ((pitch === structure.rows && structure.rows >= 4) ||
        pitch === structure.rows + 1);

    const isDoubleWhirl =
      components === 2 &&
      freeEnds === 4 &&
      ((pitch === 2 * structure.rows && structure.rows >= 4) ||
        pitch === 2 * structure.rows + 2);

    return isSingleWhirl || isDoubleWhirl;
  }

  /** Whether a repeat satisfies the structural minimum row constraint for a family. */
  private reachesMinimumRows(
    structure: MeanderStructure,
    family: MeanderFamily,
  ): boolean {
    return structure.rows >= STRUCTURAL_MINIMUM_ROWS[family];
  }

  // 🌎 Public Methods

  /**
   * Classifies a meander into a single family based on hierarchical precedence.
   */
  classify(
    characteristics: Characteristics,
    shape: MeanderShape,
  ): MeanderFamily {
    const structure: MeanderStructure = {
      ...shape,
      characteristics,
    };

    for (const rule of this.rules()) {
      if (rule.matches(structure)) {
        return rule.name;
      }
    }

    return "unclassified";
  }

  /**
   * Returns the family rules in descending precedence order.
   */
  rules(): readonly MeanderFamilyRule[] {
    return [
      {
        matches: (structure) =>
          structure.characteristics.isDots &&
          this.reachesMinimumRows(structure, "dots"),
        name: "dots",
      },
      {
        matches: (structure) =>
          structure.characteristics.isLines &&
          this.reachesMinimumRows(structure, "lines"),
        name: "lines",
      },
      {
        matches: (structure) =>
          structure.characteristics.isBars &&
          this.reachesMinimumRows(structure, "bars"),
        name: "bars",
      },
      {
        matches: (structure) =>
          structure.characteristics.isMesh &&
          this.reachesMinimumRows(structure, "mesh"),
        name: "mesh",
      },
      {
        matches: (structure) =>
          structure.characteristics.isComb &&
          this.reachesMinimumRows(structure, "comb"),
        name: "comb",
      },
      {
        matches: (structure) =>
          structure.characteristics.isArcade &&
          this.reachesMinimumRows(structure, "arcade"),
        name: "arcade",
      },
      {
        matches: (structure) => this.isBundle(structure),
        name: "parallel",
      },
      {
        matches: (structure) =>
          structure.characteristics.inkXJunctions > 0 &&
          !structure.characteristics.isMesh &&
          this.reachesMinimumRows(structure, "cross"),
        name: "cross",
      },
      {
        matches: (structure) =>
          structure.characteristics.isFork &&
          this.reachesMinimumRows(structure, "fork"),
        name: "fork",
      },
      {
        matches: (structure) =>
          structure.characteristics.isPureTree &&
          this.reachesMinimumRows(structure, "tree"),
        name: "tree",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.characteristics.pitch === structure.rows - 1 &&
          structure.characteristics.crossesTheSeam &&
          !structure.characteristics.endsAreLatticeNeighbors &&
          !this.isWaterfalls(structure) &&
          this.reachesMinimumRows(structure, "boxes"),
        name: "boxes",
      },
      {
        matches: (structure) => this.isChain(structure),
        name: "chain",
      },
      {
        matches: (structure) => this.isDoubleChain(structure),
        name: "double-chain",
      },
      {
        matches: (structure) => this.isWaterfalls(structure),
        name: "waterfalls",
      },
      {
        matches: (structure) => this.isWhirl(structure),
        name: "whirl",
      },
      {
        matches: (structure) => this.isSwirl(structure),
        name: "swirl",
      },
      {
        matches: (structure) => this.isClasps(structure),
        name: "clasps",
      },
      {
        matches: (structure) =>
          this.isClosedLoop(structure) &&
          structure.characteristics.pitch === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "snake"),
        name: "snake",
      },
      {
        matches: (structure) =>
          structure.characteristics.isStippled &&
          this.reachesMinimumRows(structure, "stipple"),
        name: "stipple",
      },
    ];
  }
}
