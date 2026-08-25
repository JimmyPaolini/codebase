import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonImportParserModule } from "./python-import-parser.module";
import { PythonImportParserService } from "./python-import-parser.service";

describe(PythonImportParserModule, () => {
  it("exports and provides PythonImportParserService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonImportParserModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonImportParserModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonImportParserService);
    expect(providersMetadata).toContain(PythonImportParserService);
  });
});
