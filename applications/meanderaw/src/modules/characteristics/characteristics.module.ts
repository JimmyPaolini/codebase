import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { GraphModule } from "../graph/graph.module";

import { CharacteristicsFamilyService } from "./characteristics-family.service";
import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { CharacteristicsService } from "./characteristics.service";
import { ConnectivityService } from "./connectivity.service";

/**
 * Wires up the Characteristic computation that reads a Code directly — no
 * grid, no SVG, no filesystem, no database — which is what lets
 * `DrawCodeService` populate a row's junction counts and boolean
 * Characteristics from the same reading it already renders from, with
 * nothing rendered in between.
 *
 * It imports `CodeModule` for the reading of a point's bits at a position,
 * and `GraphModule` for one thing: the graph walk
 * `ConnectivityService` counts a repeat's pieces with. That service
 * is written against `InkAdjacency` rather than against a document or a
 * tile, precisely so a third caller can bring its own vocabulary — see its
 * own doc comment — and this is that third caller.
 */
@Module({
  controllers: [],
  exports: [
    CharacteristicsFamilyService,
    CharacteristicsService,
    ConnectivityService,
  ],
  imports: [CodeModule, GraphModule],
  providers: [
    CharacteristicsFamilyService,
    CharacteristicsPathService,
    CharacteristicsShapeService,
    CharacteristicsService,
    ConnectivityService,
  ],
})
export class CharacteristicsModule {}
