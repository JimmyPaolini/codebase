import { describe, expect, it } from "vitest";

import {
  CODOMETER_MARKERS,
  DocumentsModule,
  DocumentsService,
  formatBytes,
  HEADING,
  RenderModule,
  RenderService,
  TABLE_HEADER,
} from "./index.js";

describe("codometer-markdown index", () => {
  it("exports the markdown surface", () => {
    expect(DocumentsModule).toBeDefined();
    expect(DocumentsService).toBeDefined();
    expect(RenderModule).toBeDefined();
    expect(RenderService).toBeDefined();
    expect(HEADING).toBeDefined();
    expect(CODOMETER_MARKERS).toBeDefined();
    expect(TABLE_HEADER).toBeDefined();
    expect(formatBytes).toBeDefined();
  });
});
