import { Inject, Injectable } from "@nestjs/common";

import { MINIMUM_STAGGER_BRANCHES } from "../branch-motif/branch-motif.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicSubFamilyService } from "../mosaic-tile/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import {
  COMPATIBLE_MODIFIERS,
  FAMILY_MAXIMUM_ROWS,
  InvalidModifierError,
  InvalidOffsetError,
  InvalidRepeatCountCycleError,
  InvalidRepeatCountError,
  InvalidRowsError,
  InvalidStaggerBranchCountError,
  InvalidStrandCountError,
  MAXIMUM_VALUE,
  MINIMUM_REPEAT_COUNT,
  MINIMUM_STRANDS,
  PLY_MODIFIER_NAMES,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  TILE_DRAWN_TYPES,
} from "./meander-generation.constants";
import { MotifRegistryService } from "./motif-registry.service";
import {
  ConflictingSubFamilyError,
  InvalidSubFamilyError,
  MissingSubFamilyError,
  SUB_FAMILIES,
  UnavailableSubFamilyError,
} from "./sub-family.constants";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type { MosaicBuildableSubFamily } from "../mosaic-tile/mosaic-tile.types";
import type {
  GenerationParameters,
  MeanderType,
  Modifier,
  MotifDrawnType,
  MotifService,
  TileDrawnType,
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
    @Inject(MosaicSubFamilyService)
    private readonly mosaicSubFamilyService: MosaicSubFamilyService,
    @Inject(MosaicTileGenerationService)
    private readonly mosaicTileGenerationService: MosaicTileGenerationService,
    @Inject(MotifRegistryService)
    private readonly motifRegistryService: MotifRegistryService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds every repeat unit's path, appending the type's shared border path when it draws one. */
  private buildPaths(
    motifService: MotifService,
    geometry: GridGeometry,
    parameters: GenerationParameters,
  ): string[] {
    const unitPaths = Array.from(
      { length: parameters.repeatCount },
      (_value, unitIndex) =>
        motifService.path(geometry, {
          isLastUnit: unitIndex === parameters.repeatCount - 1,
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

  /**
   * Renders the tile a sub-family names, rather than a motif service's own
   * repeat unit. A sub-family is a predicate over a family's unit space, so
   * asking for one is asking for a member of that space by name — which is
   * what `MosaicTileGenerationService` already draws, and why nothing here
   * needs a motif service at all.
   *
   * `rows` and `repeatCount` are validated by that service, against the row
   * count a mosaic tile needs rather than the lower floor the unmodified bar
   * gets by. A sub-family that names no tile at the requested row count is
   * rejected before that, because `diamond` at an even row count is well
   * inside those bounds and simply does not exist there — which a bounds
   * error could not say.
   */
  private generateSubFamily(
    parameters: GenerationParameters,
    subFamily: MosaicBuildableSubFamily,
  ): string {
    const subFamilyNames = SUB_FAMILIES[parameters.type];

    if (!subFamilyNames.includes(subFamily)) {
      throw new InvalidSubFamilyError(
        subFamily,
        parameters.type,
        subFamilyNames,
      );
    }

    if (parameters.modifier) {
      throw new ConflictingSubFamilyError(subFamily, parameters.modifier.name);
    }

    const tile = this.mosaicSubFamilyService.tile(subFamily, parameters.rows);

    if (!tile) {
      throw new UnavailableSubFamilyError(subFamily, parameters.rows);
    }

    return this.mosaicTileGenerationService.generate(
      tile,
      parameters.repeatCount,
    );
  }

  /** Narrows a family to a tile-drawn one, so the refusal below can name the space to pick a member of. */
  private isTileDrawnType(type: MeanderType): type is TileDrawnType {
    return TILE_DRAWN_TYPES.includes(type);
  }

  /**
   * Narrows `type` to a family that has a motif service, refusing a
   * tile-drawn one outright.
   *
   * A tile-drawn family reaches here only when no `subFamily` was given,
   * since {@link generate} routes one that was through
   * {@link generateSubFamily} before anything else. There is nothing to
   * dispatch to for it, so this is where the request is turned back —
   * {@link MissingSubFamilyError} naming the sub-families to choose from,
   * rather than a lookup answering `undefined` and a border path throwing
   * somewhere further in.
   *
   * It runs *after* the validations rather than before them, so a request
   * that is wrong about something more specific is told about that instead:
   * `--type mosaic --rows 2` is out of the family's row range, and
   * `--type mosaic --modifier flip` names a modifier the family does not
   * accept — which `COMPATIBLE_MODIFIERS` reports as "compatible modifiers:
   * none", a more useful answer than a missing sub-family.
   */
  private motifDrawnType(type: MeanderType): MotifDrawnType {
    if (this.isTileDrawnType(type)) {
      throw new MissingSubFamilyError(type, SUB_FAMILIES[type]);
    }

    return type;
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

  /**
   * Throws {@link InvalidRepeatCountCycleError} when `repeatCount` doesn't
   * divide evenly by the spin family's fixed {@link SPIN_CYCLE_LENGTH} —
   * otherwise the last repeat unit's rotation would be cut off mid-cycle
   * instead of ending back at the starting orientation.
   *
   * It is the spin family's alone. No other modifier carries a cycle a
   * `repeatCount` could cut off: `stagger`'s crenel and the ply-carrying
   * modifiers' bundles are each self-contained within one repeat unit, so
   * however many units are drawn, none of them ends partway through
   * anything.
   */
  private validateModifierCycle(
    modifier: Modifier | undefined,
    repeatCount: number,
  ): void {
    if (
      modifier &&
      SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name) &&
      repeatCount % SPIN_CYCLE_LENGTH !== 0
    ) {
      throw new InvalidRepeatCountCycleError(
        repeatCount,
        SPIN_CYCLE_LENGTH,
        modifier.name,
      );
    }
  }

  /**
   * Throws {@link InvalidOffsetError} when `serpentine`'s `offset` isn't a
   * whole number inside its own strand count.
   *
   * The bound is `strands` because the offset rotates a cyclic sequence of
   * that length: rotating it `strands` places is rotating it none, so every
   * value outside `0 … strands - 1` names a drawing already reachable by a
   * value inside it. Refused rather than folded, so a caller that meant
   * something else finds out.
   */
  private validateOffset(modifier: Modifier | undefined): void {
    if (modifier?.name !== "serpentine" || modifier.offset === undefined) {
      return;
    }

    const { offset, strands } = modifier;

    if (!Number.isInteger(offset) || offset < 0 || offset >= strands) {
      throw new InvalidOffsetError(offset, strands);
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

  /**
   * Throws {@link InvalidRowsError} when not a whole number within the
   * type's own row range.
   *
   * Both ends are the family's rather than the command line's.
   * {@link STRUCTURAL_MINIMUM_ROWS} sets the floor, below which the
   * family's characteristic figure degenerates; {@link FAMILY_MAXIMUM_ROWS}
   * sets the ceiling, which is the shared {@link MAXIMUM_VALUE} for every
   * family but `mosaic`. Reading the ceiling here rather than in the sweep
   * alone is what keeps a drawing the command line accepts and a drawing
   * the corpus commits the same set.
   */
  private validateRows(type: MeanderType, rows: number): void {
    const minimum = STRUCTURAL_MINIMUM_ROWS[type];
    const maximum = FAMILY_MAXIMUM_ROWS[type];

    if (!Number.isInteger(rows) || rows < minimum || rows > maximum) {
      throw new InvalidRowsError(rows, minimum, maximum);
    }
  }

  /**
   * Throws {@link InvalidStaggerBranchCountError} when `stagger`'s
   * `branches` isn't a whole number between
   * {@link MINIMUM_STAGGER_BRANCHES} and {@link MAXIMUM_VALUE}.
   *
   * The lower bound is the family's own rather than the command line's: a
   * two-branch run crosses a single lattice step along a border row, which
   * both of `branch`'s border rules already cover, so the crenellation the
   * parameter names leaves no mark and the drawing is a plain comb half as
   * wide. The upper bound is the shared one, the same as `alternated`'s
   * `period`, because nothing structural fails above it.
   */
  private validateStaggerBranches(modifier: Modifier | undefined): void {
    if (modifier?.name !== "stagger") {
      return;
    }

    const { branches } = modifier;

    if (
      !Number.isInteger(branches) ||
      branches < MINIMUM_STAGGER_BRANCHES ||
      branches > MAXIMUM_VALUE
    ) {
      throw new InvalidStaggerBranchCountError(
        branches,
        MINIMUM_STAGGER_BRANCHES,
        MAXIMUM_VALUE,
      );
    }
  }

  /**
   * Throws {@link InvalidStrandCountError} when a ply-carrying modifier's
   * `strands` isn't a whole number between {@link MINIMUM_STRANDS} and the
   * drawing's own row count.
   *
   * The upper bound is `rows` rather than {@link MAXIMUM_VALUE} because it
   * is the geometry's bound rather than the CLI's: a `parallel` bundle's
   * innermost strand has `rows - strands + 1` lattice steps of arm, so one
   * ply past the row count leaves it a bare crossbar running alongside
   * nothing. `STRUCTURAL_MINIMUM_ROWS` cannot state that, since it is one
   * number per family and this one moves with the modifier.
   */
  private validateStrands(modifier: Modifier | undefined, rows: number): void {
    if (!modifier || !PLY_MODIFIER_NAMES.includes(modifier.name)) {
      return;
    }

    if (!("strands" in modifier)) {
      return;
    }

    const { strands } = modifier;

    if (
      !Number.isInteger(strands) ||
      strands < MINIMUM_STRANDS ||
      strands > rows
    ) {
      throw new InvalidStrandCountError(strands, MINIMUM_STRANDS, rows);
    }
  }

  // 🌎 Public Methods

  /**
   * Validates the parameters, then renders the finished SVG document. A
   * `subFamily` names a member of the family's own unit space and takes a
   * different route through {@link generateSubFamily}, since there is no
   * motif service to dispatch to for it — and for a tile-drawn family it is
   * the only route, which {@link motifDrawnType} is what enforces.
   */
  generate(parameters: GenerationParameters): string {
    if (parameters.subFamily) {
      return this.generateSubFamily(parameters, parameters.subFamily);
    }

    this.validateRows(parameters.type, parameters.rows);
    this.validateRepeatCount(parameters.repeatCount);
    this.validateModifier(parameters.type, parameters.modifier);
    this.validateModifierCycle(parameters.modifier, parameters.repeatCount);
    this.validateStaggerBranches(parameters.modifier);
    this.validateStrands(parameters.modifier, parameters.rows);
    this.validateOffset(parameters.modifier);

    const motifService = this.motifRegistryService.resolve(
      this.motifDrawnType(parameters.type),
    );
    const geometry = this.gridGeometryService.compute(parameters.rows);

    const paths = this.buildPaths(motifService, geometry, parameters);
    const rightEdge = motifService.rightEdge(geometry, {
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
