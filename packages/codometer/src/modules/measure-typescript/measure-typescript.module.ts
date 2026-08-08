import { Module } from "@nestjs/common";

import { MeasureTypescriptService } from "./measure-typescript.service";

/**
 * NestJS module that provides TypeScript and JavaScript code analysis.
 */
@Module({
  controllers: [],
  exports: [MeasureTypescriptService],
  imports: [],
  providers: [MeasureTypescriptService],
})
export class MeasureTypescriptModule {}
