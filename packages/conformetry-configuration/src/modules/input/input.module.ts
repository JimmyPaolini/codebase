import { Module } from "@nestjs/common";

import { InputOptionsService } from "./input-options.service";
import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";
import { InputService } from "./input.service";

/**
 * Owns command-line argument parsing and interactive input resolution.
 *
 * `InputOptionsService` is exported as well as `InputService` because the Nx
 * integration needs option normalization without the prompting machinery.
 */
@Module({
  controllers: [],
  exports: [InputOptionsService, InputService],
  imports: [],
  providers: [
    InputOptionsService,
    InputPromptingService,
    InputSchemaService,
    InputService,
  ],
})
export class InputModule {}
