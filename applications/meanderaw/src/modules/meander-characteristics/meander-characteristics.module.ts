import { Module } from "@nestjs/common";

import { GraphModule } from "../graph/graph.module";

import { MeanderCharacteristicsService } from "./meander-characteristics.service";
import { MeanderConnectivityService } from "./meander-connectivity.service";

/**
 * Wires up the Characteristic computation that reads a decoded Code's
 * per-point grid directly — no SVG, no filesystem, no database — which is
 * what lets `DrawCodeService` populate a row's junction counts and boolean
 * Characteristics from the same grid it already decodes to render, with
 * nothing rendered in between.
 *
 * It imports `GraphModule` for one thing: the graph walk
 * `MeanderConnectivityService` counts a repeat's pieces with. That service
 * is written against `InkAdjacency` rather than against a document or a
 * tile, precisely so a third caller can bring its own vocabulary — see its
 * own doc comment — and this is that third caller.
 */
@Module({
  controllers: [],
  exports: [MeanderCharacteristicsService, MeanderConnectivityService],
  imports: [GraphModule],
  providers: [MeanderCharacteristicsService, MeanderConnectivityService],
})
export class MeanderCharacteristicsModule {}
