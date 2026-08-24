import { describe, expect, it } from "vitest";

import {
  AnchorNotFoundError,
  AnchorsModule,
  AnchorsService,
  CodependixCommand,
  CodependixModule,
  CodependixService,
  DeliveryModule,
  DeliveryService,
  MainModule,
} from "./index.js";

describe("codependix-cli index", () => {
  it("exports the CLI surface", () => {
    expect(MainModule).toBeDefined();
    expect(AnchorsModule).toBeDefined();
    expect(AnchorsService).toBeDefined();
    expect(AnchorNotFoundError).toBeDefined();
    expect(CodependixModule).toBeDefined();
    expect(CodependixService).toBeDefined();
    expect(CodependixCommand).toBeDefined();
    expect(DeliveryModule).toBeDefined();
    expect(DeliveryService).toBeDefined();
  });
});
