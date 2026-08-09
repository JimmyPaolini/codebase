import { Module } from "@nestjs/common";

import { PythonValidatorService } from "./python-validator.service";

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
