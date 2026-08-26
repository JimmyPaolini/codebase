import { ModuleGraphModule, NestjsProjectModule } from "@codependix/nestjs";
import { Module } from "@nestjs/common";

import { NestjsGraphsService } from "./nestjs-graphs.service";

/** Provides the NestJS module-graph examples. */
@Module({
  controllers: [],
  exports: [NestjsGraphsService],
  imports: [ModuleGraphModule, NestjsProjectModule],
  providers: [NestjsGraphsService],
})
export class NestjsGraphsModule {}
