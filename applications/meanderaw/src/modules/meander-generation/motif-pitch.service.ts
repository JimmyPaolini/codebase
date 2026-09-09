import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  MODIFIER_REPEAT_PITCHES,
  PITCH_PROBE_REPEAT_COUNT,
} from "./meander-generation.constants";
import { MotifRegistryService } from "./motif-registry.service";

import type {
  MotifPitchOptions,
  MotifWidthOptions,
} from "./meander-generation.types";

/**
 * How wide one repeat unit of a family is, in lattice columns, and how wide
 * one of its true repeats is — the two are the same number for every family
 * whose consecutive units are identical, and {@link columnSpan} is where
 * they part company.
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
   * The lattice columns the whole drawing spans at one repeat count — the
   * same number `MeanderLatticeService` reads back off the finished
   * document, derived here from the motif's own right edge so a caller can
   * ask before anything is rendered.
   *
   * It measures one right edge where {@link columnPitch} subtracts two, and
   * the difference is why that one is not written in terms of this one: a
   * pitch is the difference of two widths, and rounding each width to a
   * whole column before subtracting is not the same operation as rounding
   * the difference.
   */
  columnCount(options: MotifWidthOptions): number {
    const { modifier, repeatCount, rows, type } = options;
    const geometry = this.gridGeometryService.compute(rows);
    const motifService = this.motifRegistryService.resolve(type);

    return Math.round(
      motifService.rightEdge(geometry, {
        repeatCount,
        rows,
        ...(modifier ? { modifier } : {}),
      }) / geometry.unit,
    );
  }

  /**
   * The pitch: the lattice columns the drawing's right edge advances by when
   * one repeat unit is added.
   *
   * It is how far along the drawing one unit sits from the next, which is
   * not always how far apart two *identical* units sit — see
   * {@link columnSpan}. It is also the width of the drawing's own
   * termination artifacts, so it is the margin an addressed window has to
   * clear at either end.
   *
   * Rounded because the arithmetic is in canvas pixels rather than in
   * columns — the grid unit is a canvas height divided by a row count, so a
   * row count that does not divide it evenly leaves the quotient a hair off
   * a whole number. The quantity itself is a count of lattice columns and
   * so is always whole; the rounding recovers it rather than approximating
   * it.
   */
  columnPitch(options: MotifPitchOptions): number {
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

  /**
   * The column span of one **true** repeat: the distance between two units
   * of the drawing that are identical, which is a whole number of pitches.
   *
   * Usually one of them. A modifier that varies its unit — a rotation, an
   * alternating flip, an alternating bundle orientation — comes back only
   * after several, and {@link MODIFIER_REPEAT_PITCHES} says how many. A
   * drawing addressed at its pitch instead would have as many addresses as
   * that modifier has phases, which is what this exists to prevent.
   */
  columnSpan(options: MotifPitchOptions): number {
    const pitches = options.modifier
      ? (MODIFIER_REPEAT_PITCHES[options.modifier.name] ?? 1)
      : 1;

    return pitches * this.columnPitch(options);
  }
}
