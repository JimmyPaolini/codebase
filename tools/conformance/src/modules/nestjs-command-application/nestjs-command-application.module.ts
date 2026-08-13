import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsCommandApplicationCommand } from "./nestjs-command-application.command";

/**
 * TODO: Document the nestjsCommandApplicationGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsCommandApplicationCommand],
  imports: [GeneratorModule],
  providers: [NestjsCommandApplicationCommand],
})
export class NestjsCommandApplicationModule {}
