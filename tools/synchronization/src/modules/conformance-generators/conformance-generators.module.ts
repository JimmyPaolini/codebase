import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConformanceGeneratorsCommand } from "./conformance-generators.command";

/**
 * TODO: Document the conformanceGenerators module.
 */
@Module({
  controllers: [],
  exports: [ConformanceGeneratorsCommand],
  imports: [ConfigurationModule, LoggerModule],
  providers: [ConformanceGeneratorsCommand, SynchronizationService],
})
export class ConformanceGeneratorsModule {}
