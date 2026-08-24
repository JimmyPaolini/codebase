import { Module } from "@nestjs/common";

import { TypescriptProjectModule } from "../typescript-project/typescript-project.module";

import { ImportGraphService } from "./import-graph.service";

/** Provides the file-level import Graph builder and its mermaid renderer. */
@Module({
  controllers: [],
  exports: [ImportGraphService],
  imports: [TypescriptProjectModule],
  providers: [ImportGraphService],
})
export class ImportGraphModule {}
