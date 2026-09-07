import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { PITCH_PROBE_REPEAT_COUNT } from "./meander-generation.constants";
import { MotifRegistryService } from "./motif-registry.service";

import type { MotifPitchOptions } from "./meander-generation.types";

/**
 * How wide one repeat unit of a family is, in lattice columns.
 *
 * Every family already answers this, and none of them answers it by name:
 * a motif service reports how far right a whole pattern reaches, and the
 * pitch is what that number grows by when one more unit is drawn. So it is
 * recovered by asking for two consecutive repeat counts and subtracting,
 * over the grid unit the same geometry declares — which is why adding a
 * family costs nothing here, and why no motif service gains a method to
 * report a number it already implies.
 *
 * It sits beside {@link MotifRegistryService} rather than beside the reader
 * that needs it, because the registry is the family dispatch and is
 * deliberately not exported from this module. A pitch is a fact about the
 * drawing rather than about the reading, so the dependency runs from
 * whoever is reading a document to here, and never back.
 */
@Injectable()
export class MotifPitchService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(MotifRegistryService)
    private readonly motifRegistryService: MotifRegistryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * The column span of one repeat unit: the lattice columns the drawing's
   * right edge advances by when a unit is added.
   *
   * Rounded because the arithmetic is in canvas pixels rather than in
   * columns — the grid unit is a canvas height divided by a row count, so a
   * row count that does not divide it evenly leaves the quotient a hair off
   * a whole number. The quantity itself is a count of lattice columns and
   * so is always whole; the rounding recovers it rather than approximating
   * it.
   */
  columnSpan(options: MotifPitchOptions): number {
    const { modifier, rows, type } = options;
    const geometry = this.gridGeometryService.compute(rows);
    const motifService = this.motifRegistryService.resolve(type);
    const rightEdge = (repeatCount: number): number =>
      motifService.rightEdge(geometry, {
        repeatCount,
        rows,
        ...(modifier ? { modifier } : {}),
      });

    return Math.round(
      (rightEdge(PITCH_PROBE_REPEAT_COUNT + 1) -
        rightEdge(PITCH_PROBE_REPEAT_COUNT)) /
        geometry.unit,
    );
  }
}
