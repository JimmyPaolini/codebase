import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { ReactComponentCommand } from "./react-component.command";

/**
 * TODO: Document the reactComponentGenerator module.
 */
@Module({
  controllers: [],
  exports: [ReactComponentCommand],
  imports: [GeneratorModule],
  providers: [ReactComponentCommand],
})
export class ReactComponentModule {}
