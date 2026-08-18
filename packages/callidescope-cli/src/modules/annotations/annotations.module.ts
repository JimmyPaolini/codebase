import { Module } from "@nestjs/common";

import { AnnotationsService } from "./annotations.service";

/**
 * Provides the signature and documentation a report prints beside a frame.
 */
@Module({
  controllers: [],
  exports: [AnnotationsService],
  imports: [],
  providers: [AnnotationsService],
})
export class AnnotationsModule {}
