import { DeliveryModule } from "@codependix/cli";
import { Module } from "@nestjs/common";

import { NestjsGraphsModule } from "../nestjs-graphs/nestjs-graphs.module";
import { NxGraphsModule } from "../nx-graphs/nx-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { TypescriptImportsModule } from "../typescript-imports/typescript-imports.module";

import { GraphLevelsService } from "./graph-levels.service";

/** Provides the example that puts all four graph levels side by side. */
@Module({
  controllers: [],
  exports: [GraphLevelsService],
  imports: [
    DeliveryModule,
    NestjsGraphsModule,
    NxGraphsModule,
    PythonImportsModule,
    TypescriptImportsModule,
  ],
  providers: [GraphLevelsService],
})
export class GraphLevelsModule {}
