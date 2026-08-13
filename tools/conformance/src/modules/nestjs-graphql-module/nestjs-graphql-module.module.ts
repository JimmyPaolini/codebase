import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsGraphqlModuleCommand } from "./nestjs-graphql-module.command";

/**
 * TODO: Document the nestjsGraphqlModuleGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsGraphqlModuleCommand],
  imports: [GeneratorModule],
  providers: [NestjsGraphqlModuleCommand],
})
export class NestjsGraphqlModuleModule {}
