import { Module } from "@nestjs/common";

import { TypescriptService } from "./typescript.service";

/**
 * NestJS module that provides TypeScript and JavaScript code analysis.
 */
@Module({
  controllers: [],
  exports: [TypescriptService],
  imports: [],
  providers: [TypescriptService],
})
export class TypescriptModule {}
