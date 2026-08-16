import { Module } from "@nestjs/common";

import { ReadmeService } from "./readme.service";

/**
 * NestJS module that provides README badge writing tooling.
 */
@Module({
  controllers: [],
  exports: [ReadmeService],
  imports: [],
  providers: [ReadmeService],
})
export class ReadmeModule {}
