import { Module } from "@nestjs/common";

import { GraphModule } from "../../../graph/graph.module";
import { ConnectivityService } from "../../connectivity.service";

import { BottomBorderTouchCountCharacteristicService } from "./bottom-border-touch-count-characteristic.service";
import { InflectionCountCharacteristicService } from "./inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService as MaximumMonotonicTurnLengthCharacteristicService } from "./max-monotonic-turn-length-characteristic.service";
import { TightestTurnCountCharacteristicService } from "./tightest-turn-count-characteristic.service";
import { TopBorderTouchCountCharacteristicService } from "./top-border-touch-count-characteristic.service";
import { TotalTurnCountCharacteristicService } from "./total-turn-count-characteristic.service";

/**
 * Provides and exports every turn-dynamics path characteristic evaluator —
 * how the ink turns along its strands and how often it touches the band's
 * two border rules — as one group `CharacteristicsModule` imports and
 * re-exports. It provides its own stateless `ConnectivityService` rather
 * than importing `CharacteristicsModule`, which imports this module.
 */
@Module({
  controllers: [],
  exports: [
    BottomBorderTouchCountCharacteristicService,
    InflectionCountCharacteristicService,
    MaximumMonotonicTurnLengthCharacteristicService,
    TightestTurnCountCharacteristicService,
    TopBorderTouchCountCharacteristicService,
    TotalTurnCountCharacteristicService,
  ],
  imports: [GraphModule],
  providers: [
    BottomBorderTouchCountCharacteristicService,
    ConnectivityService,
    InflectionCountCharacteristicService,
    MaximumMonotonicTurnLengthCharacteristicService,
    TightestTurnCountCharacteristicService,
    TopBorderTouchCountCharacteristicService,
    TotalTurnCountCharacteristicService,
  ],
})
export class TurnCharacteristicsModule {}
