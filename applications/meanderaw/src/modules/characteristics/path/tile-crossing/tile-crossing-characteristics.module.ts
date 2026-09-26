import { Module } from "@nestjs/common";

import { GraphModule } from "../../../graph/graph.module";
import { ConnectivityService } from "../../connectivity.service";

import { TileCrossingComponentDeltaCountCharacteristicService } from "./tile-crossing-component-delta-count-characteristic.service";
import { TileCrossingCountCharacteristicService } from "./tile-crossing-count-characteristic.service";
import { TileCrossingCycleCountCharacteristicService } from "./tile-crossing-cycle-count-characteristic.service";

/**
 * Provides and exports every tile crossing path characteristic evaluator —
 * what crosses the join between a tile's last column and its first — as one
 * group `CharacteristicsModule` imports and re-exports. It provides its own
 * stateless `ConnectivityService` rather than importing
 * `CharacteristicsModule`, which imports this module.
 */
@Module({
  controllers: [],
  exports: [
    TileCrossingComponentDeltaCountCharacteristicService,
    TileCrossingCountCharacteristicService,
    TileCrossingCycleCountCharacteristicService,
  ],
  imports: [GraphModule],
  providers: [
    ConnectivityService,
    TileCrossingComponentDeltaCountCharacteristicService,
    TileCrossingCountCharacteristicService,
    TileCrossingCycleCountCharacteristicService,
  ],
})
export class TileCrossingCharacteristicsModule {}
