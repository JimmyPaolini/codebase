import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { GraphModule } from "../graph/graph.module";

import { MeanderCharacteristicsService } from "./meander-characteristics.service";
import { MeanderConnectivityService } from "./meander-connectivity.service";

/**
 * Wires up the Characteristic computation that reads a Code directly — no
 * grid, no SVG, no filesystem, no database — which is what lets
 * `DrawCodeService` populate a row's junction counts and boolean
 * Characteristics from the same reading it already renders from, with
 * nothing rendered in between.
 *
 * It imports `CodeModule` for the reading of a point's bits at a position,
 * and `GraphModule` for one thing: the graph walk
 * `MeanderConnectivityService` counts a repeat's pieces with. That service
 * is written against `InkAdjacency` rather than against a document or a
 * tile, precisely so a third caller can bring its own vocabulary — see its
 * own doc comment — and this is that third caller.
 */
@Module({
  controllers: [],
  exports: [MeanderCharacteristicsService, MeanderConnectivityService],
  imports: [CodeModule, GraphModule],
  providers: [MeanderCharacteristicsService, MeanderConnectivityService],
})
export class MeanderCharacteristicsModule {}
