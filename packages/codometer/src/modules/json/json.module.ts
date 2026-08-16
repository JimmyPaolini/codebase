import { Module } from "@nestjs/common";

import { JsonService } from "./json.service";

/**
 * TODO: Document the measureJson module.
 */
@Module({
  controllers: [],
  exports: [JsonService],
  imports: [],
  providers: [JsonService],
})
export class JsonModule {}
