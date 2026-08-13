import { Module } from "@nestjs/common";

import { InputService } from "./input.service";

/**
 * Provides interactive and schema-driven generator input handling.
 */
@Module({
  controllers: [],
  exports: [InputService],
  imports: [],
  providers: [InputService],
})
export class InputModule {}
