import { Module } from "@nestjs/common";

import { ComponentsService } from "./components.service";
import { DepthService } from "./depth.service";
import { GraphService } from "./graph.service";
import { PathsService } from "./paths.service";

/**
 * Provides graph assembly, cycle condensation, and depth measurement.
 */
@Module({
  controllers: [],
  exports: [ComponentsService, DepthService, GraphService, PathsService],
  imports: [],
  providers: [ComponentsService, DepthService, GraphService, PathsService],
})
export class GraphModule {}
