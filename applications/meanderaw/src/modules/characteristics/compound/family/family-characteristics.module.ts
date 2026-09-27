import { Module } from "@nestjs/common";

import { TopologyCharacteristicsModule } from "../../path/topology/topology-characteristics.module";
import { CrossCharacteristicsModule } from "../../submatrix/cross/cross-characteristics.module";
import { ForkCharacteristicsModule } from "../../submatrix/fork/fork-characteristics.module";
import { PointCharacteristicsModule } from "../../submatrix/point/point-characteristics.module";
import { CompoundUtilitiesService } from "../compound-utilities.service";

import { FamilyUtilitiesService } from "./family-utilities.service";
import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsCrossCharacteristicService } from "./is-cross-characteristic.service";
import { IsDotsCharacteristicService } from "./is-dots-characteristic.service";
import { IsForkCharacteristicService } from "./is-fork-characteristic.service";
import { IsLinesCharacteristicService } from "./is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";
import { IsParallelCharacteristicService } from "./is-parallel-characteristic.service";
import { IsPureTreeCharacteristicService } from "./is-pure-tree-characteristic.service";
import { IsStippledCharacteristicService } from "./is-stippled-characteristic.service";

/**
 * Provides and exports every compound family characteristic evaluator — one
 * boolean per family `ClassificationService` recognizes from a whole-grid
 * template or from the topology, fork, cross, and point counts — as one
 * group `CharacteristicsModule` imports and re-exports. It imports the
 * groups whose evaluators these predicates read, and provides its own
 * stateless `CompoundUtilitiesService` and `FamilyUtilitiesService`.
 */
@Module({
  controllers: [],
  exports: [
    IsArcadeCharacteristicService,
    IsBarsCharacteristicService,
    IsCombCharacteristicService,
    IsCrossCharacteristicService,
    IsDotsCharacteristicService,
    IsForkCharacteristicService,
    IsLinesCharacteristicService,
    IsMeshCharacteristicService,
    IsParallelCharacteristicService,
    IsPureTreeCharacteristicService,
    IsStippledCharacteristicService,
  ],
  imports: [
    CrossCharacteristicsModule,
    ForkCharacteristicsModule,
    PointCharacteristicsModule,
    TopologyCharacteristicsModule,
  ],
  providers: [
    CompoundUtilitiesService,
    FamilyUtilitiesService,
    IsArcadeCharacteristicService,
    IsBarsCharacteristicService,
    IsCombCharacteristicService,
    IsCrossCharacteristicService,
    IsDotsCharacteristicService,
    IsForkCharacteristicService,
    IsLinesCharacteristicService,
    IsMeshCharacteristicService,
    IsParallelCharacteristicService,
    IsPureTreeCharacteristicService,
    IsStippledCharacteristicService,
  ],
})
export class FamilyCharacteristicsModule {}
