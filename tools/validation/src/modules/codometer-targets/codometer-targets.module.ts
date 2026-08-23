import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { CodometerTargetsCommand } from "./codometer-targets.command";
import { CodometerTargetsService } from "./codometer-targets.service";

/** Provides the codometer-targets check command. */
@Module({
  controllers: [],
  exports: [CodometerTargetsCommand, CodometerTargetsService],
  imports: [LoggerModule],
  providers: [CodometerTargetsCommand, CodometerTargetsService],
})
export class CodometerTargetsModule {}
