import { Module } from "@nestjs/common";

import { CssService } from "./css.service";

/**
 * NestJS module that provides Css source analysis.
 */
@Module({
  controllers: [],
  exports: [CssService],
  imports: [],
  providers: [CssService],
})
export class CssModule {}
