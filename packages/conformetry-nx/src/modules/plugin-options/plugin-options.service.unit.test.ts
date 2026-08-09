import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PluginOptionsService } from "./plugin-options.service";

describe(PluginOptionsService, () => {
  let service: PluginOptionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PluginOptionsService],
    }).compile();

    service = await module.resolve(PluginOptionsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
