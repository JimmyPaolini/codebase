import { Module } from "@nestjs/common";

import { PythonValidatorService } from "./python-validator.service.js";

/**
 * Provides the Python validator service.
 */
@Module({
  controllers: [],
  exports: [PythonValidatorService],
  imports: [],
  providers: [PythonValidatorService],
})
export class PythonValidatorModule {}
