import { Module } from "@nestjs/common";

import { TomlService } from "./toml.service";

/**
 * NestJS module that provides Toml source analysis.
 */
@Module({
  controllers: [],
  exports: [TomlService],
  imports: [],
  providers: [TomlService],
})
export class TomlModule {}
