import { describe, expect, it } from "vitest";

import {
  AnchorNotFoundError,
  AnchorsModule,
  AnchorsService,
  DeliveryModule,
  DeliveryService,
  MainModule,
  MapCommand,
  MapModule,
  MapService,
} from "./index.js";

describe("codependix-cli index", () => {
  it("exports the CLI surface", () => {
    expect(MainModule).toBeDefined();
    expect(AnchorsModule).toBeDefined();
    expect(AnchorsService).toBeDefined();
    expect(AnchorNotFoundError).toBeDefined();
    expect(MapModule).toBeDefined();
    expect(MapService).toBeDefined();
    expect(MapCommand).toBeDefined();
    expect(DeliveryModule).toBeDefined();
    expect(DeliveryService).toBeDefined();
  });
});
