import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConformetryGeneratorsCommand } from "./conformetry-generators.command";

/**
 * TODO: Document the conformetryGenerators module.
 */
@Module({
  controllers: [],
  exports: [ConformetryGeneratorsCommand],
  imports: [ConfigurationModule, LoggerModule],
  providers: [ConformetryGeneratorsCommand, SynchronizationService],
})
export class ConformetryGeneratorsModule {}
