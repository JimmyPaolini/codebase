import { Inject, Injectable } from "@nestjs/common";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
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
    private readonly boxesMotifService: BoxesMotifService,
    @Inject(BranchMotifService)
    private readonly branchMotifService: BranchMotifService,
    @Inject(ChainMotifService)
    private readonly chainMotifService: ChainMotifService,
    @Inject(CrossMotifService)
    private readonly crossMotifService: CrossMotifService,
    @Inject(MosaicMotifService)
    private readonly mosaicMotifService: MosaicMotifService,
    @Inject(NegativeMotifService)
    private readonly negativeMotifService: NegativeMotifService,
    @Inject(SnakeMotifService)
    private readonly snakeMotifService: SnakeMotifService,
    @Inject(SwirlMotifService)
    private readonly swirlMotifService: SwirlMotifService,
    @Inject(WhirlMotifService)
    private readonly whirlMotifService: WhirlMotifService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** The motif service that draws `type`'s repeat units. */
  resolve(type: MeanderType): MotifService {
    const motifServicesByType: Record<MeanderType, MotifService> = {
      boxes: this.boxesMotifService,
      branch: this.branchMotifService,
      chain: this.chainMotifService,
      cross: this.crossMotifService,
      mosaic: this.mosaicMotifService,
      negative: this.negativeMotifService,
      snake: this.snakeMotifService,
      swirl: this.swirlMotifService,
      whirl: this.whirlMotifService,
    };

    return motifServicesByType[type];
  }
}
