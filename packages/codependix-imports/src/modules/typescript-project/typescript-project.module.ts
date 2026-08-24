import { Module } from "@nestjs/common";

import { TypescriptProjectService } from "./typescript-project.service";

/** Provides TypeScript project discovery and `ts.Program` construction. */
@Module({
  controllers: [],
  exports: [TypescriptProjectService],
  imports: [],
  providers: [TypescriptProjectService],
})
export class TypescriptProjectModule {}
