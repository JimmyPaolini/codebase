import { Module } from "@nestjs/common";

import { MeasurePythonService } from "./measure-python.service";

/**
 * NestJS module that provides Python code analysis.
 */
@Module({
  controllers: [],
  exports: [MeasurePythonService],
  imports: [],
  providers: [MeasurePythonService],
})
export class MeasurePythonModule {}
