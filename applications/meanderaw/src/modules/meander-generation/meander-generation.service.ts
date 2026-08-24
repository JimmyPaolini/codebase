import { Inject, Injectable } from "@nestjs/common";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { InvalidRepeatCountError } from "./invalid-repeat-count.errors";
import { InvalidRowsError } from "./invalid-rows.errors";
import {
  MAXIMUM_VALUE,
  MINIMUM_REPEAT_COUNT,
  STRUCTURAL_MINIMUM_ROWS,
} from "./meander-generation.constants";
import { SvgRenderingService } from "./svg-rendering.service";

import type {
  GenerationParameters,
  GridGeometry,
  MeanderType,
} from "./meander-generation.types";

/**
 * Turns generation parameters into a finished SVG document: validates
 * `rows` and `repeatCount`, computes the shared grid geometry, delegates to
 * the type's motif service for path data, and hands the result to the
 * rendering service.
 */
@Injectable()
export class MeanderGenerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(BoxesMotifService)
    private readonly boxesMotifService: BoxesMotifService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds every repeat unit's path plus the shared top/bottom border path. */
  private buildPaths(
    geometry: GridGeometry,
    parameters: GenerationParameters,
  ): string[] {
    const unitPaths = Array.from(
      { length: parameters.repeatCount },
      (_value, unitIndex) =>
        this.boxesMotifService.path(geometry, parameters.rows, unitIndex),
    );

    return [
      ...unitPaths,
      this.boxesMotifService.border(
        geometry,
        parameters.rows,
        parameters.repeatCount,
      ),
    ];
  }

  /** Throws {@link InvalidRepeatCountError} when not a whole number within the shared bounds. */
  private validateRepeatCount(repeatCount: number): void {
    if (
      !Number.isInteger(repeatCount) ||
      repeatCount < MINIMUM_REPEAT_COUNT ||
      repeatCount > MAXIMUM_VALUE
    ) {
      throw new InvalidRepeatCountError(
        repeatCount,
        MINIMUM_REPEAT_COUNT,
        MAXIMUM_VALUE,
      );
    }
  }

  /** Throws {@link InvalidRowsError} when not a whole number within the type's structural minimum and the shared maximum. */
  private validateRows(type: MeanderType, rows: number): void {
    const minimum = STRUCTURAL_MINIMUM_ROWS[type];

    if (!Number.isInteger(rows) || rows < minimum || rows > MAXIMUM_VALUE) {
      throw new InvalidRowsError(rows, minimum, MAXIMUM_VALUE);
    }
  }

  // 🌎 Public Methods

  /** Validates the parameters, then renders the finished SVG document. */
  generate(parameters: GenerationParameters): string {
    this.validateRows(parameters.type, parameters.rows);
    this.validateRepeatCount(parameters.repeatCount);

    const geometry = this.gridGeometryService.compute(parameters.rows);
    const paths = this.buildPaths(geometry, parameters);
    const rightEdge = this.boxesMotifService.rightEdge(
      geometry,
      parameters.rows,
      parameters.repeatCount,
    );
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    return this.svgRenderingService.render({
      height: format(
        geometry.offset + geometry.height + geometry.strokeWidth / 2,
      ),
      paths,
      strokeWidth: format(geometry.strokeWidth),
      width: format(rightEdge + geometry.strokeWidth / 2),
    });
  }
}
