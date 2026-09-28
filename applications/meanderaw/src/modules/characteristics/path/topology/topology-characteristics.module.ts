import { Module } from "@nestjs/common";

import { GraphModule } from "../../../graph/graph.module";
import { ConnectivityService } from "../../connectivity.service";

import { BettiNumber0CountCharacteristicService } from "./betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "./betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "./free-end-count-characteristic.service";

/**
 * Provides and exports every topological path characteristic evaluator —
 * the two Betti numbers and the free-end count — as one group
 * `CharacteristicsModule` imports and re-exports. It provides its own
 * stateless `ConnectivityService` rather than importing
 * `CharacteristicsModule`, which imports this module.
 */
@Module({
  controllers: [],
  exports: [
    BettiNumber0CountCharacteristicService,
    BettiNumber1CountCharacteristicService,
    FreeEndCountCharacteristicService,
  ],
  imports: [GraphModule],
  providers: [
    BettiNumber0CountCharacteristicService,
    BettiNumber1CountCharacteristicService,
    ConnectivityService,
    FreeEndCountCharacteristicService,
  ],
})
export class TopologyCharacteristicsModule {}
