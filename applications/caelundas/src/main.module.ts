import { Module } from "@nestjs/common";

import { CaelundasModule } from "./modules/caelundas/caelundas.module";

/**
 * Compatibility root module for conformetry command-project validation.
 */
@Module({
  controllers: [],
  exports: [],
  imports: [CaelundasModule],
  providers: [],
})
export class MainModule {}
