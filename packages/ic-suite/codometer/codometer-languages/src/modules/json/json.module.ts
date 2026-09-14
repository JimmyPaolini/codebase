import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { JsonService } from "./json.service";

/**
 * TODO: Document the measureJson module.
 */
@Module({
  controllers: [],
  exports: [JsonService],
  imports: [LoggerModule],
  providers: [JsonService],
})
export class JsonModule {}
