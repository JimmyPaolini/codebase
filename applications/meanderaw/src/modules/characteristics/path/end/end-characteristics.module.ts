import { Module } from "@nestjs/common";

import { GraphModule } from "../../../graph/graph.module";
import { ConnectivityService } from "../../connectivity.service";

import { EndsAreLatticeNeighborsCharacteristicService } from "./ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "./ends-on-border-rules-characteristic.service";

/**
 * Provides and exports every free-end characteristic evaluator — how a
 * Code's exactly two free ends sit relative to the lattice and the band's
 * own border rules — as one group `CharacteristicsModule` imports and
 * re-exports. It provides its own stateless `ConnectivityService` rather
 * than importing `CharacteristicsModule`, which imports this module.
 */
@Module({
  controllers: [],
  exports: [
    EndsAreLatticeNeighborsCharacteristicService,
    EndsOnBorderRulesCharacteristicService,
  ],
  imports: [GraphModule],
  providers: [
    ConnectivityService,
    EndsAreLatticeNeighborsCharacteristicService,
    EndsOnBorderRulesCharacteristicService,
  ],
})
export class EndCharacteristicsModule {}
