import { Module } from "@nestjs/common";

import { PythonProjectService } from "./python-project.service";

/** Provides Python project discovery and source-file listing. */
@Module({
  controllers: [],
  exports: [PythonProjectService],
  imports: [],
  providers: [PythonProjectService],
})
export class PythonProjectModule {}
