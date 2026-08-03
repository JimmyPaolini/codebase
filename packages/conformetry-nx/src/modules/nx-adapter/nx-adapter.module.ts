import { Module } from "@nestjs/common";

import { NxAdapterService } from "./nx-adapter.service.js";

/**
 * Provides the Nx adapter service.
 */
@Module({
  controllers: [],
  exports: [NxAdapterService],
  imports: [],
  providers: [NxAdapterService],
})
export class NxAdapterModule {}
