import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { NestjsGraphqlApplicationCommand } from "./nestjs-graphql-application.command";

/**
 * TODO: Document the nestjsGraphqlApplicationGenerator module.
 */
@Module({
  controllers: [],
  exports: [NestjsGraphqlApplicationCommand],
  imports: [GeneratorModule],
  providers: [NestjsGraphqlApplicationCommand],
})
export class NestjsGraphqlApplicationModule {}
