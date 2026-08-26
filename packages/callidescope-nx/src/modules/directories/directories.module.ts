import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ProjectsModule } from "../projects/projects.module";

import { DirectoriesCommand } from "./directories.command";

/** Provides the command that turns Nx project names into directories. */
@Module({
  controllers: [],
  exports: [DirectoriesCommand],
  imports: [LoggerModule, ProjectsModule],
  providers: [DirectoriesCommand],
})
export class DirectoriesModule {}
