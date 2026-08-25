import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonImportGraphModule } from "./python-import-graph.module";
import { PythonImportGraphService } from "./python-import-graph.service";

describe(PythonImportGraphModule, () => {
  it("exports and provides PythonImportGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonImportGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonImportGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonImportGraphService);
    expect(providersMetadata).toContain(PythonImportGraphService);
  });
});
