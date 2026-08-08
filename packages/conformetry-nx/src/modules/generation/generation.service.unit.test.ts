import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CommandExecutionService } from "../command-execution/command-execution.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";
import { GenerationService } from "./generation.service.js";

describe(GenerationService, () => {
  let service: GenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CommandExecutionService,
          useValue: {
            runGenerateCommand: async () => {},
          },
        },
        {
          provide: PluginOptionsService,
          useValue: {
            resolveConformetryNxPluginOptions: () => ({}) ,
            resolveConformetryConfigurationPath: async () => "",
          },
        },
        GenerationService,
      ],
    }).compile();

    service = await module.resolve(GenerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
