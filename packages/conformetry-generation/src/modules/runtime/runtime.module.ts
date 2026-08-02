import { Module } from "@nestjs/common";

import { GenerationRuntimeService } from "./runtime.service.js";

/**
 * Provides the generation runtime service.
 */
@Module({
  controllers: [],
  exports: [GenerationRuntimeService],
  imports: [],
  providers: [GenerationRuntimeService],
})
export class RuntimeModule {}
