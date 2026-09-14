import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { HclService } from "./hcl.service";

/**
 * NestJS module that provides Hcl source analysis.
 */
@Module({
  controllers: [],
  exports: [HclService],
  imports: [LoggerModule],
  providers: [HclService],
})
export class HclModule {}
