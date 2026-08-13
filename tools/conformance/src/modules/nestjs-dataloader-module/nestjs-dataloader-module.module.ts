import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsDataloaderModuleCommand } from "./nestjs-dataloader-module.command";

/**
 * Auto-generated documentation placeholder.
 */
@Module({
  controllers: [],
  exports: [NestjsDataloaderModuleCommand],
  imports: [GeneratorModule],
  providers: [NestjsDataloaderModuleCommand],
})
export class NestjsDataloaderModuleModule {}
