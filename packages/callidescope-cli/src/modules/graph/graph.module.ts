import { Module } from "@nestjs/common";

import { AnnotationsModule } from "../annotations/annotations.module";

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
  imports: [AnnotationsModule],
  providers: [ComponentsService, DepthService, GraphService, PathsService],
})
export class GraphModule {}
