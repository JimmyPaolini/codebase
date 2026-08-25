import { Module } from "@nestjs/common";

import { PythonImportParserService } from "./python-import-parser.service";

/** Provides the parser that turns Python source into import specifiers. */
@Module({
  controllers: [],
  exports: [PythonImportParserService],
  imports: [],
  providers: [PythonImportParserService],
})
export class PythonImportParserModule {}
