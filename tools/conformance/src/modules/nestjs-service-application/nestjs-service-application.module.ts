import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsServiceApplicationCommand } from "./nestjs-service-application.command";

/**
 * Module that provides the nestjs-service-application generator command.
 */
@Module({
  controllers: [],
  exports: [NestjsServiceApplicationCommand],
  imports: [GeneratorModule],
  providers: [NestjsServiceApplicationCommand],
})
export class NestjsServiceApplicationModule {}
