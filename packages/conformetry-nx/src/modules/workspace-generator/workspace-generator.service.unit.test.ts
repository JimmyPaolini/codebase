import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GenerationService } from "../generation/generation.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";
import { WorkspaceGeneratorService } from "./workspace-generator.service.js";

describe(WorkspaceGeneratorService, () => {
  let service: WorkspaceGeneratorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: GenerationService,
          useValue: {
            runConformetryGenerator: async () => async () => {},
          },
        },
        {
          provide: PluginOptionsService,
          useValue: {
            resolveConformetryNxPluginOptionsFromNxJson: () => ({}),
          },
        },
        WorkspaceGeneratorService,
      ],
    }).compile();

    service = await module.resolve(WorkspaceGeneratorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
