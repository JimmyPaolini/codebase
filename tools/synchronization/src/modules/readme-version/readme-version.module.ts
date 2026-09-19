import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { ReadmeVersionCommand } from "./readme-version.command";
import { ReadmeVersionService } from "./readme-version.service";

/** Provides the readme-version synchronization command. */
@Module({
  controllers: [],
  exports: [ReadmeVersionCommand, ReadmeVersionService],
  imports: [LoggerModule],
  providers: [
    ReadmeVersionCommand,
    ReadmeVersionService,
    SynchronizationService,
  ],
})
export class ReadmeVersionModule {}
