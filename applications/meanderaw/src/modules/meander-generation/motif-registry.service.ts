import { Inject, Injectable } from "@nestjs/common";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import type { MeanderType, MotifService } from "./meander-generation.types";

/**
 * Holds one {@link MotifService} per family and hands back the one a
 * {@link MeanderType} names.
 *
 * It exists so that adding a family is an edit to one dispatch rather than
 * to every caller's constructor. `MeanderGenerationService` used to inject
 * every motif service by name, which put its parameter count one family
 * below the workspace's constructor limit — the next family added would
 * have failed lint before it drew anything. Injecting a registry instead
 * leaves that service with the four collaborators it actually orchestrates,
 * and moves the per-family list here, where it is the whole point of the
 * class rather than an incidental cost of adding one.
 *
 * `Record<MeanderType, MotifService>` is what keeps the dispatch total: a
 * family added to the union without an entry here is a type error, so
 * {@link resolve} needs no fallback and can never answer with the wrong
 * family's geometry.
 */
@Injectable()
export class MotifRegistryService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(BoxesMotifService)
    boxesMotifService: BoxesMotifService,
    @Inject(BranchMotifService)
    branchMotifService: BranchMotifService,
    @Inject(ChainMotifService)
    chainMotifService: ChainMotifService,
    @Inject(CrossMotifService)
    crossMotifService: CrossMotifService,
    @Inject(MosaicMotifService)
    mosaicMotifService: MosaicMotifService,
    @Inject(NegativeMotifService)
    negativeMotifService: NegativeMotifService,
    @Inject(ParallelMotifService)
    parallelMotifService: ParallelMotifService,
    @Inject(SnakeMotifService)
    snakeMotifService: SnakeMotifService,
    @Inject(SwirlMotifService)
    swirlMotifService: SwirlMotifService,
    @Inject(WhirlMotifService)
    whirlMotifService: WhirlMotifService,
  ) {
    this.motifServicesByType = {
      boxes: boxesMotifService,
      branch: branchMotifService,
      chain: chainMotifService,
      cross: crossMotifService,
      mosaic: mosaicMotifService,
      negative: negativeMotifService,
      parallel: parallelMotifService,
      snake: snakeMotifService,
      swirl: swirlMotifService,
      whirl: whirlMotifService,
    };
  }

  // 🔐 Private Fields

  /**
   * Every family's motif service, keyed by the type that names it. Built
   * once here rather than per call: `MeanderGenerationService.generate`
   * resolves twice, and the map is the same object every time.
   */
  private readonly motifServicesByType: Record<MeanderType, MotifService>;

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** The motif service that draws `type`'s repeat units. */
  resolve(type: MeanderType): MotifService {
    return this.motifServicesByType[type];
  }
}
