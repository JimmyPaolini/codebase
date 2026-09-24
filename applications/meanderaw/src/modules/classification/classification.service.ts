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
 * `parallel` -\> `cross` -\> `branch` -\> `boxes` -\> `whirl` -\> `swirl` -\> `chain` -\> `snake` -\> `unclassified`.
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

  /** Whether a repeat's ink is free of T-junctions and X-junctions. */
  private isJunctionFree(structure: MeanderStructure): boolean {
    const { inkTJunctions, inkXJunctions } = structure.characteristics;

    return inkTJunctions === 0 && inkXJunctions === 0;
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

    if (characteristics.hasDots) {
      return "dotted";
    }

    return "unclassified";
  }

  /**
   * Returns the family rules in descending precedence order.
   */
  rules(): readonly MeanderFamilyRule[] {
    return [
      {
        matches: (structure) => this.isBundle(structure),
        name: "parallel",
      },
      {
        matches: (structure) =>
          structure.characteristics.inkXJunctions > 0 &&
          structure.characteristics.inkTJunctions === 0 &&
          this.reachesMinimumRows(structure, "cross"),
        name: "cross",
      },
      {
        matches: (structure) =>
          structure.characteristics.inkTJunctions > 0 &&
          structure.characteristics.inkXJunctions === 0 &&
          structure.characteristics.cycles === 0 &&
          this.reachesMinimumRows(structure, "branch"),
        name: "branch",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.characteristics.pitch === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "boxes"),
        name: "boxes",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.characteristics.pitch === structure.rows &&
          this.reachesMinimumRows(structure, "whirl"),
        name: "whirl",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.characteristics.pitch === 2 * structure.rows - 3 &&
          this.reachesMinimumRows(structure, "swirl"),
        name: "swirl",
      },
      {
        matches: (structure) =>
          this.isJunctionFree(structure) &&
          structure.characteristics.cycles === 0 &&
          structure.characteristics.crossesTheSeam &&
          structure.characteristics.reversesAtItsTightestTurn &&
          this.reachesMinimumRows(structure, "chain"),
        name: "chain",
      },
      {
        matches: (structure) =>
          this.isJunctionFree(structure) &&
          structure.characteristics.cycles === 0 &&
          !structure.characteristics.crossesTheSeam &&
          structure.characteristics.reversesAtItsTightestTurn &&
          this.reachesMinimumRows(structure, "clasps"),
        name: "clasps",
      },
      {
        matches: (structure) =>
          this.isClosedLoop(structure) &&
          structure.characteristics.pitch === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "snake"),
        name: "snake",
      },
    ];
  }
}
