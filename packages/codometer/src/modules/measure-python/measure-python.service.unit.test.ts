import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeasurePythonService } from "./measure-python.service";

describe(MeasurePythonService, () => {
  let service: MeasurePythonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeasurePythonService],
    }).compile();

    service = await module.resolve(MeasurePythonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
