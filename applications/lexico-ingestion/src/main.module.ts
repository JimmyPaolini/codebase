import { Module } from "@nestjs/common";

import { LexicoIngestionModule } from "./modules/lexico-ingestion/lexico-ingestion.module";

/**
 * Compatibility root module for conformetry command-project validation.
 */
@Module({
  controllers: [],
  exports: [],
  imports: [LexicoIngestionModule],
  providers: [],
})
export class MainModule {}
