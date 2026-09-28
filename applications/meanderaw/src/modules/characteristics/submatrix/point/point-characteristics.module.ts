import { Module } from "@nestjs/common";

import { DotCountCharacteristicService } from "./dot-count-characteristic.service";
import { HorizontalEdgeCountCharacteristicService } from "./horizontal-edge-count-characteristic.service";
import { VerticalEdgeCountCharacteristicService } from "./vertical-edge-count-characteristic.service";

/**
 * Provides and exports every 1×1 point characteristic evaluator — bare
 * points and straight edges — as one group `CharacteristicsModule` imports
 * and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    DotCountCharacteristicService,
    HorizontalEdgeCountCharacteristicService,
    VerticalEdgeCountCharacteristicService,
  ],
  imports: [],
  providers: [
    DotCountCharacteristicService,
    HorizontalEdgeCountCharacteristicService,
    VerticalEdgeCountCharacteristicService,
  ],
})
export class PointCharacteristicsModule {}
