import { TypescriptModule } from "@codependix/imports";
import { Module } from "@nestjs/common";

import { TypescriptImportsService } from "./typescript-imports.service";

/** Provides the TypeScript file-level import graph examples. */
@Module({
  controllers: [],
  exports: [TypescriptImportsService],
  imports: [TypescriptModule],
  providers: [TypescriptImportsService],
})
export class TypescriptImportsModule {}
