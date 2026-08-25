import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonProjectModule } from "./python-project.module";
import { PythonProjectService } from "./python-project.service";

describe(PythonProjectModule, () => {
  it("exports and provides PythonProjectService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonProjectModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonProjectModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonProjectService);
    expect(providersMetadata).toContain(PythonProjectService);
  });
});
