import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsPathService } from "./characteristics-path.service";
import { ConnectivityService } from "./connectivity.service";

describe(CharacteristicsPathService, () => {
  let service: CharacteristicsPathService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CharacteristicsPathService,
        { provide: ConnectivityService, useValue: {} },
      ],
    }).compile();

    service = await module.resolve(CharacteristicsPathService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
