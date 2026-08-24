import { describe, expect, it } from "vitest";

import {
  NEIGHBORHOOD_IMPLICIT_LEGEND,
  NEIGHBORHOOD_MERMAID_HEADER,
  NEIGHBORHOOD_SUBJECT_STYLE,
  NEIGHBORHOOD_UNCONNECTED,
  NeighborhoodModule,
  NeighborhoodService,
} from "./index.js";

describe("codependix-nx index", () => {
  it("exports the neighborhood surface", () => {
    expect(NeighborhoodModule).toBeDefined();
    expect(NeighborhoodService).toBeDefined();
    expect(NEIGHBORHOOD_UNCONNECTED).toBeDefined();
    expect(NEIGHBORHOOD_MERMAID_HEADER).toBeDefined();
    expect(NEIGHBORHOOD_SUBJECT_STYLE).toBeDefined();
    expect(NEIGHBORHOOD_IMPLICIT_LEGEND).toBeDefined();
  });
});
