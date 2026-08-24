import { Inject, Injectable } from "@nestjs/common";

import { BoxesMotifService } from "./boxes-motif.service";
import { ChainMotifService } from "./chain-motif.service";
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
import { SnakeMotifService } from "./snake-motif.service";
import { SvgRenderingService } from "./svg-rendering.service";
import { SwirlMotifService } from "./swirl-motif.service";
import { WhirlMotifService } from "./whirl-motif.service";

import type {
  GenerationParameters,
  GridGeometry,
  MeanderType,
  Modifier,
  MotifService,
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
    @Inject(ChainMotifService)
    private readonly chainMotifService: ChainMotifService,
    @Inject(SnakeMotifService)
    private readonly snakeMotifService: SnakeMotifService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
    @Inject(SwirlMotifService)
    private readonly swirlMotifService: SwirlMotifService,
    @Inject(WhirlMotifService)
    private readonly whirlMotifService: WhirlMotifService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds every repeat unit's path, appending the type's shared border path when it draws one. */
  private buildPaths(
    geometry: GridGeometry,
    parameters: GenerationParameters,
  ): string[] {
    const motifService = this.motifService(parameters.type);
    const unitPaths = Array.from(
      { length: parameters.repeatCount },
      (_value, unitIndex) =>
        motifService.path(geometry, {
          rows: parameters.rows,
          unitIndex,
          ...(parameters.modifier ? { modifier: parameters.modifier } : {}),
        }),
    );

    if (!motifService.border) {
      return unitPaths;
    }

    return [
      ...unitPaths,
      motifService.border(geometry, {
        repeatCount: parameters.repeatCount,
        rows: parameters.rows,
        ...(parameters.modifier ? { modifier: parameters.modifier } : {}),
      }),
    ];
  }

  /** Looks up the motif service that draws `type`'s repeat units. */
  private motifService(type: MeanderType): MotifService {
    const motifServicesByType: Record<MeanderType, MotifService> = {
      boxes: this.boxesMotifService,
      chain: this.chainMotifService,
      snake: this.snakeMotifService,
      swirl: this.swirlMotifService,
      whirl: this.whirlMotifService,
    };

    return motifServicesByType[type];
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
    const rightEdge = this.motifService(parameters.type).rightEdge(geometry, {
      repeatCount: parameters.repeatCount,
      rows: parameters.rows,
      ...(parameters.modifier ? { modifier: parameters.modifier } : {}),
    });
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
