import { Module } from "@nestjs/common";

import { ConfigurationLoaderService } from "./configuration-loader.service";

/**
 * NestJS module that wires finding, reading, and parsing configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationLoaderService],
  imports: [],
  providers: [ConfigurationLoaderService],
})
export class ConfigurationLoaderModule {}
