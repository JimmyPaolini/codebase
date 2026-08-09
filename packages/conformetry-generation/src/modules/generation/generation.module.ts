import { Module } from "@nestjs/common";

import { GenerationService } from "./generation.service";

/**
 * Provides the generation service.
 */
@Module({
  controllers: [],
  exports: [GenerationService],
  imports: [],
  providers: [GenerationService],
})
export class GenerationModule {}
