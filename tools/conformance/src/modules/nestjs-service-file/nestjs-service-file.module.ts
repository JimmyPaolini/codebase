import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsServiceFileCommand } from "./nestjs-service-file.command";

/**
 * TODO: Document the nestjsServiceFileGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsServiceFileCommand],
  imports: [GeneratorModule],
  providers: [NestjsServiceFileCommand],
})
export class NestjsServiceFileModule {}
