import { PythonModule } from "@codependix/imports";
import { Module } from "@nestjs/common";

import { PythonImportsService } from "./python-imports.service";

/** Provides the Python file-level import graph examples. */
@Module({
  controllers: [],
  exports: [PythonImportsService],
  imports: [PythonModule],
  providers: [PythonImportsService],
})
export class PythonImportsModule {}
