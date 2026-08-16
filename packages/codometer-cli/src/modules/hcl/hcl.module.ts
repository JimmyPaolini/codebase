import { Module } from "@nestjs/common";

import { HclService } from "./hcl.service";

/**
 * NestJS module that provides Hcl source analysis.
 */
@Module({
  controllers: [],
  exports: [HclService],
  imports: [],
  providers: [HclService],
})
export class HclModule {}
