import { Module } from "@nestjs/common";

import { InputService } from "./input.service";

/**
 * Provides the shared parsing rules codometer's commands read options with.
 */
@Module({
  controllers: [],
  exports: [InputService],
  imports: [],
  providers: [InputService],
})
export class InputModule {}
