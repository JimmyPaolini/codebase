import { Module } from "@nestjs/common";

import { MeanderDecodingService } from "./meander-decoding.service";

/** Registers the generic Code decoder every family's drawing now starts from. */
@Module({
  controllers: [],
  exports: [MeanderDecodingService],
  imports: [],
  providers: [MeanderDecodingService],
})
export class MeanderDecodingModule {}
