import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import { TERMINATION_MARGIN_PITCHES } from "../lattice-identification/lattice-identification.constants";
import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import {
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { isMotifDrawnType } from "../meander-generation/meander-generation.utilities";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import { NarrowRepeatCountError } from "./draw.constants";

import type {
  LatticeAddress,
  LatticeUnit,
} from "../lattice-identification/lattice-identification.types";
import type {
  GenerationParameters,
  Modifier,
  MotifWidthOptions,
} from "../meander-generation/meander-generation.types";
import type { RenderedDocument } from "./draw.types";

/**
 * Renders one set of generation parameters into the document that gets
 * written and the path it is written to.
 *
 * It is the whole of what both of `DrawCommand`'s modes do with a set of
 * parameters — the sweep maps it over an enumeration, the single drawing
 * calls it once — and it is a service rather than a method on the command
 * because that is what lets a test drive the real chain instead of
 * reassembling it. A test that re-derives the address itself passes just as
 * happily when the command has stopped asking for one.
 *
 * The document is generated first so its lattice address can be read off
 * it — {@link addressFor} — and handed to `OutputPathService.build`
 * alongside the parameters that name the drawing's variant. Both halves of
 * a drawing's name therefore come from the same render, rather than the
 * path being decided before the ink that would address it exists.
 */
@Injectable()
export class DrawRenderingService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LatticeIdentificationService)
    private readonly latticeIdentificationService: LatticeIdentificationService,
    @Inject(MeanderGenerationService)
    private readonly meanderGenerationService: MeanderGenerationService,
    @Inject(MotifPitchService)
    private readonly motifPitchService: MotifPitchService,
    @Inject(OutputPathService)
    private readonly outputPathService: OutputPathService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The lattice address `svg` earns at `parameters`, or `undefined` for a
   * family this cannot be asked for.
   *
   * `mosaic` is the one family that answer excludes: it draws no motif for
   * `MotifPitchService` to probe a pitch from, and its committed drawings
   * already carry a full address of their own — see
   * `FILENAME_ADDRESS_CONVENTION`. Every other family's pitch and true-repeat
   * span come from `MotifPitchService`, over the same `options` shape
   * {@link MotifPitchService.columnPitch} and {@link
   * MotifPitchService.columnSpan} both take.
   */
  private addressFor(
    parameters: GenerationParameters,
    svg: string,
  ): LatticeAddress | undefined {
    const { modifier, repeatCount, rows, type } = parameters;

    if (!isMotifDrawnType(type)) {
      return undefined;
    }

    const options = {
      repeatCount,
      rows,
      type,
      ...(modifier ? { modifier } : {}),
    };
    const unit = {
      pitch: this.motifPitchService.columnPitch(options),
      span: this.motifPitchService.columnSpan(options),
    };

    this.assertAddressableWidth(options, unit);

    return this.latticeIdentificationService.identifyDocument(svg, unit);
  }

  /**
   * Refuses a repeat count that draws the family too narrow to be
   * addressed, before `LatticeIdentificationService` refuses it in terms of
   * columns and spans instead.
   *
   * The two refuse the same drawings — this reads
   * `TERMINATION_MARGIN_PITCHES` rather than restating it — and the
   * difference is only who the message is for. That one answers "can this
   * document be addressed at this unit", which is a question about a
   * finished document; this one answers "how many repeats should have been
   * asked for", which is the question the command line actually asked.
   *
   * The minimum needs no search. Every family's width is affine in the
   * repeat count — see `PITCH_PROBE_REPEAT_COUNT` — so one more repeat is
   * one more addressable pitch, and the shortfall in pitches is exactly the
   * shortfall in repeats.
   */
  private assertAddressableWidth(
    options: MotifWidthOptions,
    unit: LatticeUnit,
  ): void {
    const pitches = Math.floor(
      this.motifPitchService.columnCount(options) / unit.pitch,
    );
    const required = unit.span / unit.pitch + 2 * TERMINATION_MARGIN_PITCHES;

    if (pitches >= required) {
      return;
    }

    const { modifier, repeatCount, type } = options;

    throw new NarrowRepeatCountError(
      repeatCount,
      this.cycledRepeatCount(repeatCount + required - pitches, modifier),
      modifier ? `${type} ${modifier.name}` : type,
    );
  }

  /**
   * A repeat count rounded up to the spin family's own cycle, which is the
   * one modifier family whose intermediate counts are refused by
   * `MeanderGenerationService.validateModifierCycle`. Suggesting one of
   * those would be sending a reader from one refusal to another.
   */
  private cycledRepeatCount(
    repeatCount: number,
    modifier: Modifier | undefined,
  ): number {
    if (!modifier || !SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)) {
      return repeatCount;
    }

    return Math.ceil(repeatCount / SPIN_CYCLE_LENGTH) * SPIN_CYCLE_LENGTH;
  }

  // 🌎 Public Methods

  /** Renders one set of generation parameters, beside the path those parameters name. */
  render(parameters: GenerationParameters): RenderedDocument {
    const svg = this.meanderGenerationService.generate(parameters);
    const address = this.addressFor(parameters, svg);
    const filePath = this.outputPathService.build(parameters, address);

    return {
      directory: path.posix.dirname(filePath),
      fileName: path.posix.basename(filePath),
      svg,
    };
  }
}
