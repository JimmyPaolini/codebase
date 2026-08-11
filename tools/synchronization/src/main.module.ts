import { Module } from "@nestjs/common";

import { SynchronizationModule } from "./modules/synchronization/synchronization.module";

/**
 * Compatibility root module for conformetry command-project validation.
 */
@Module({
  controllers: [],
  exports: [],
  imports: [SynchronizationModule],
  providers: [],
})
export class MainModule {}
