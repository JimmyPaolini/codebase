import { Injectable } from "@nestjs/common";

import { CANVAS_HEIGHT } from "./grid-geometry.constants";

import type { GridGeometry } from "./grid-geometry.types";

/**
 * Derives the shared scaling rule every meander motif is drawn against: a
 * fixed canvas height divided into `rows` grid units, with offset and stroke
 * width derived from that unit rather than set independently.
 */
@Injectable()
export class GridGeometryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Derives grid unit, offset, and stroke width from a row count and the fixed canvas height. */
  compute(rows: number): GridGeometry {
    const unit = CANVAS_HEIGHT / rows;

    return {
      height: CANVAS_HEIGHT,
      offset: unit / 4,
      strokeWidth: unit / 2,
      unit,
    };
  }

  /** Rounds a coordinate to five decimal places and trims any trailing zeros. */
  formatCoordinate(value: number): string {
    return Number(value.toFixed(5)).toString();
  }
}
