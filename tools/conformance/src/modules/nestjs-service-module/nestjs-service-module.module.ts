import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsServiceModuleCommand } from "./nestjs-service-module.command";

/**
 * TODO: Document the nestjsServiceModuleGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsServiceModuleCommand],
  imports: [GeneratorModule],
  providers: [NestjsServiceModuleCommand],
})
export class NestjsServiceModuleModule {}
