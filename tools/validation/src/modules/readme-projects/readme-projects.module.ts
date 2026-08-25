import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ReadmeProjectsCommand } from "./readme-projects.command";
import { ReadmeProjectsService } from "./readme-projects.service";

/** Provides the readme-projects check command. */
@Module({
  controllers: [],
  exports: [ReadmeProjectsCommand, ReadmeProjectsService],
  imports: [LoggerModule],
  providers: [ReadmeProjectsCommand, ReadmeProjectsService],
})
export class ReadmeProjectsModule {}
