import { RenderingModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { GenerationService } from "./generation.service";

/**
 * Provides the generator runtime that renders a template tree onto disk.
 */
@Module({
  controllers: [],
  exports: [GenerationService],
  imports: [RenderingModule],
  providers: [GenerationService],
})
export class GenerationModule {}
