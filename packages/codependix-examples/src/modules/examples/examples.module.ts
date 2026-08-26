import { Module } from "@nestjs/common";

import { AnchorPlacementModule } from "../anchor-placement/anchor-placement.module";
import { ConfigurationResolutionModule } from "../configuration-resolution/configuration-resolution.module";
import { ExportDeliveryModule } from "../export-delivery/export-delivery.module";
import { GraphLevelsModule } from "../graph-levels/graph-levels.module";
import { NestjsGraphsModule } from "../nestjs-graphs/nestjs-graphs.module";
import { NxGraphsModule } from "../nx-graphs/nx-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { TypescriptImportsModule } from "../typescript-imports/typescript-imports.module";

import { ExamplesCommand } from "./examples.command";
import { ExamplesService } from "./examples.service";

/** Provides the example runner and the command that writes or checks it. */
@Module({
  controllers: [],
  exports: [ExamplesCommand, ExamplesService],
  imports: [
    AnchorPlacementModule,
    ConfigurationResolutionModule,
    ExportDeliveryModule,
    GraphLevelsModule,
    NestjsGraphsModule,
    NxGraphsModule,
    PythonImportsModule,
    TypescriptImportsModule,
  ],
  providers: [ExamplesCommand, ExamplesService],
})
export class ExamplesModule {}
