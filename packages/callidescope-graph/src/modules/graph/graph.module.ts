import { Module } from "@nestjs/common";

import { DocumentationModule } from "../documentation/documentation.module";
import { SignaturesModule } from "../signatures/signatures.module";

import { BreadthService } from "./breadth.service";
import { CallTreeService } from "./call-tree.service";
import { ComponentsService } from "./components.service";
import { DepthService } from "./depth.service";
import { GraphService } from "./graph.service";
import { PathsService } from "./paths.service";

/**
 * Provides graph assembly, cycle condensation, and depth and breadth measurement.
 */
@Module({
  controllers: [],
  exports: [
    BreadthService,
    CallTreeService,
    ComponentsService,
    DepthService,
    GraphService,
    PathsService,
  ],
  imports: [DocumentationModule, SignaturesModule],
  providers: [
    BreadthService,
    CallTreeService,
    ComponentsService,
    DepthService,
    GraphService,
    PathsService,
  ],
})
export class GraphModule {}
