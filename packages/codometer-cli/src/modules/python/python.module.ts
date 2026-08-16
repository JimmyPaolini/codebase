import { Module } from "@nestjs/common";

import { PythonService } from "./python.service";

/**
 * NestJS module that provides Python code analysis.
 */
@Module({
  controllers: [],
  exports: [PythonService],
  imports: [],
  providers: [PythonService],
})
export class PythonModule {}
