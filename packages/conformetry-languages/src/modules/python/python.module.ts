import { DifferencesModule, ScoringModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { PythonBridgeService } from "./python-bridge.service";
import { PythonService } from "./python.service";

/**
 * Provides the Python language validator.
 *
 * `PythonBridgeService` is exported as well, because a notebook's code cells
 * are Python and `conformetry-jupyter` validates them through the same bridge.
 */
@Module({
  controllers: [],
  exports: [PythonBridgeService, PythonService],
  imports: [DifferencesModule, ScoringModule],
  providers: [PythonBridgeService, PythonService],
})
export class PythonModule {}
