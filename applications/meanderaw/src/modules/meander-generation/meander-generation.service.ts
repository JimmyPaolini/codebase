import { Inject, Injectable } from "@nestjs/common";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { InvalidModifierError } from "./invalid-modifier.errors";
import { InvalidRepeatCountCycleError } from "./invalid-repeat-count-cycle.errors";
import { InvalidRepeatCountError } from "./invalid-repeat-count.errors";
import { InvalidRowsError } from "./invalid-rows.errors";
import {
  COMPATIBLE_MODIFIERS,
  MAXIMUM_VALUE,
  MINIMUM_REPEAT_COUNT,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
} from "./meander-generation.constants";
import { SvgRenderingService } from "./svg-rendering.service";

import type {
  GenerationParameters,
  GridGeometry,
  MeanderType,
  Modifier,
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
        this.boxesMotifService.path(geometry, {
          rows: parameters.rows,
          unitIndex,
          ...(parameters.modifier ? { modifier: parameters.modifier } : {}),
        }),
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

  /** Throws {@link InvalidModifierError} when the modifier's `name` isn't compatible with `type`. */
  private validateModifier(
    type: MeanderType,
    modifier: Modifier | undefined,
  ): void {
    if (!modifier) {
      return;
    }

    const compatibleModifierNames = COMPATIBLE_MODIFIERS[type];

    if (!compatibleModifierNames.includes(modifier.name)) {
      throw new InvalidModifierError(
        modifier.name,
        type,
        compatibleModifierNames,
      );
    }
  }

  /** Throws {@link InvalidRepeatCountCycleError} when `repeatCount` doesn't divide evenly by the modifier's rotation cycle. */
  private validateModifierCycle(
    modifier: Modifier | undefined,
    repeatCount: number,
  ): void {
    if (!modifier || !SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)) {
      return;
    }

    if (repeatCount % SPIN_CYCLE_LENGTH !== 0) {
      throw new InvalidRepeatCountCycleError(
        repeatCount,
        SPIN_CYCLE_LENGTH,
        modifier.name,
      );
    }
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
    this.validateModifier(parameters.type, parameters.modifier);
    this.validateModifierCycle(parameters.modifier, parameters.repeatCount);

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
