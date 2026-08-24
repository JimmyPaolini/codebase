import { describe, expect, it } from "vitest";

import {
  ChangesModule,
  ChangesService,
  codometerReportSchema,
  REPORT_GLOBS,
} from "./index.js";

describe("codometer-changes index", () => {
  it("exports the changes surface", () => {
    expect(ChangesModule).toBeDefined();
    expect(ChangesService).toBeDefined();
    expect(codometerReportSchema).toBeDefined();
    expect(REPORT_GLOBS).toBeDefined();
  });
});
