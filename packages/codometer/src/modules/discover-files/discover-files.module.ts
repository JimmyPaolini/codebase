import { Module } from "@nestjs/common";

import { DiscoverFilesService } from "./discover-files.service";

/**
 * NestJS module that discovers and categorizes git-tracked files.
 */
@Module({
  controllers: [],
  exports: [DiscoverFilesService],
  imports: [],
  providers: [DiscoverFilesService],
})
export class DiscoverFilesModule {}
