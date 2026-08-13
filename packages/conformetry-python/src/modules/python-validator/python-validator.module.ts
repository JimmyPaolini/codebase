import { ErrorsModule } from "@jimmypaolini/conformetry-core";
import { Module } from "@nestjs/common";

import { PythonBridgeService } from "./python-bridge.service";
import { PythonValidatorService } from "./python-validator.service";

/**
 * Provides the Python language validator.
 *
 * `PythonBridgeService` is exported as well, because a notebook's code cells
 * are Python and `conformetry-jupyter` validates them through the same bridge.
 */
@Module({
  controllers: [],
  exports: [PythonBridgeService, PythonValidatorService],
  imports: [ErrorsModule],
  providers: [PythonBridgeService, PythonValidatorService],
})
export class PythonValidatorModule {}
