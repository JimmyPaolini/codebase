import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { DensityCharacteristicService } from "./density-characteristic.service";
import { DotCountCharacteristicService } from "./dot-count-characteristic.service";
import { EdgeCountCharacteristicService } from "./edge-count-characteristic.service";
import { HorizontalEdgeCountCharacteristicService } from "./horizontal-edge-count-characteristic.service";
import { InkPointCountCharacteristicService } from "./ink-point-count-characteristic.service";
import { PointUtilitiesService } from "./point-utilities.service";
import { VerticalEdgeCountCharacteristicService } from "./vertical-edge-count-characteristic.service";

/**
 * Provides and exports every 1×1 point characteristic evaluator — bare
 * points, straight edges, and the grid-wide edge, ink, and density tallies
 * read from the same points — as one group `CharacteristicsModule` imports
 * and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    DensityCharacteristicService,
    DotCountCharacteristicService,
    EdgeCountCharacteristicService,
    HorizontalEdgeCountCharacteristicService,
    InkPointCountCharacteristicService,
    PointUtilitiesService,
    VerticalEdgeCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    DensityCharacteristicService,
    DotCountCharacteristicService,
    EdgeCountCharacteristicService,
    HorizontalEdgeCountCharacteristicService,
    InkPointCountCharacteristicService,
    PointUtilitiesService,
    VerticalEdgeCountCharacteristicService,
  ],
})
export class PointCharacteristicsModule {}
