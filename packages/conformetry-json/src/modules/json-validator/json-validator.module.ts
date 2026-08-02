import { Module } from "@nestjs/common";

import { JsonValidatorService } from "./json-validator.service.js";

/**
 * Provides the JSON validator service.
 */
@Module({
  controllers: [],
  exports: [JsonValidatorService],
  imports: [],
  providers: [JsonValidatorService],
})
export class JsonValidatorModule {}
