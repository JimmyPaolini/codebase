import { Module } from "@nestjs/common";

import { WriteReadmeService } from "./write-readme.service";

/**
 * NestJS module that provides README badge writing tooling.
 */
@Module({
  controllers: [],
  exports: [WriteReadmeService],
  imports: [],
  providers: [WriteReadmeService],
})
export class WriteReadmeModule {}
