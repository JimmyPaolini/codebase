import { Module } from "@nestjs/common";

import { TopologyCharacteristicsModule } from "../../path/topology/topology-characteristics.module";
import { CrossCharacteristicsModule } from "../../submatrix/cross/cross-characteristics.module";
import { ForkCharacteristicsModule } from "../../submatrix/fork/fork-characteristics.module";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { IsClosedLoopCharacteristicService } from "./is-closed-loop-characteristic.service";
import { IsSingleArcCharacteristicService } from "./is-single-arc-characteristic.service";

/**
 * Provides and exports every compound structure characteristic evaluator —
 * whether a repeating unit is one open arc or one closed loop — as one group
 * `CharacteristicsModule` imports and re-exports. It imports the topology,
 * fork, and cross groups whose evaluators these predicates read, and
 * provides its own stateless `CompoundUtilitiesService`.
 */
@Module({
  controllers: [],
  exports: [
    IsClosedLoopCharacteristicService,
    IsSingleArcCharacteristicService,
  ],
  imports: [
    CrossCharacteristicsModule,
    ForkCharacteristicsModule,
    TopologyCharacteristicsModule,
  ],
  providers: [
    CompoundUtilitiesService,
    IsClosedLoopCharacteristicService,
    IsSingleArcCharacteristicService,
  ],
})
export class StructureCharacteristicsModule {}
