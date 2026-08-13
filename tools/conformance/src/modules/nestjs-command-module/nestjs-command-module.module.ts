import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsCommandModuleCommand } from "./nestjs-command-module.command";

/**
 * TODO: Document the nestjsCommandModuleGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsCommandModuleCommand],
  imports: [GeneratorModule],
  providers: [NestjsCommandModuleCommand],
})
export class NestjsCommandModuleModule {}
