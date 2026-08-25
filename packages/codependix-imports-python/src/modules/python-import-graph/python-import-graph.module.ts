import { Module } from "@nestjs/common";

import { PythonImportParserModule } from "../python-import-parser/python-import-parser.module";
import { PythonProjectModule } from "../python-project/python-project.module";

import { PythonImportGraphService } from "./python-import-graph.service";

/** Provides the Python file-level import Graph builder and its mermaid renderer. */
@Module({
  controllers: [],
  exports: [PythonImportGraphService],
  imports: [PythonImportParserModule, PythonProjectModule],
  providers: [PythonImportGraphService],
})
export class PythonImportGraphModule {}
