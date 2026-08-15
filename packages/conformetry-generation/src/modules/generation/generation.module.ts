import { Module } from "@nestjs/common";

import { RenderingModule } from "../rendering/rendering.module";

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
