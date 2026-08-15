import { Module } from "@nestjs/common";

import { ErrorsService } from "./errors.service";

/**
 * Owns construction and narrowing of structured conformance errors.
 *
 * Imported by every validator package so error shapes stay identical across
 * languages, and by `conformetry-files` for the file and directory categories.
 */
@Module({
  controllers: [],
  exports: [ErrorsService],
  imports: [],
  providers: [ErrorsService],
})
export class ErrorsModule {}
