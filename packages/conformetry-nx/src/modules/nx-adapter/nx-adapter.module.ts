import { Module } from "@nestjs/common";

import { NxAdapterService } from "./nx-adapter.service.js";
import { NxGeneratorFactoryService } from "./nx-generator-factory.service.js";

/**
 * Provides the Nx adapter service.
 */
@Module({
  controllers: [],
  exports: [NxAdapterService],
  imports: [],
  providers: [NxAdapterService, NxGeneratorFactoryService],
})
export class NxAdapterModule {}
