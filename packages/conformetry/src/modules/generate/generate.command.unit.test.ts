import { createMock } from "@golevelup/ts-vitest";
import {
  ConfigurationService,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { GenerateCommand } from "./generate.command";

import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

const CONFIGURATION: ConformetryConfiguration = [
  {
    inputs: { name: { type: "string" } },
    instances: [],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
];

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(GenerateCommand, () => {
  let command: GenerateCommand;
  let configurationService: ConfigurationService;
  let generationService: GenerationService;
  let inputService: InputService;
  let logger: LoggerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: GenerationService,
          useValue: createMock<GenerationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(GenerateCommand);
    configurationService = await module.resolve(ConfigurationService);
    generationService = await module.resolve(GenerationService);
    inputService = await module.resolve(InputService);
    logger = await module.resolve(LoggerService);

    vi.mocked(
      configurationService.loadConformetryConfiguration,
    ).mockResolvedValue(CONFIGURATION);
    vi.mocked(inputService.resolveGeneratorInputs).mockResolvedValue({
      name: "my-widget",
    });
    vi.mocked(generationService.runGenerator).mockResolvedValue({
      generatedFilePaths: ["/w/generated/widget/my-widget.ts"],
      outputDirectoryPath: "/w/generated/widget",
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", () => {
    expect(logger.setContext).toHaveBeenCalledWith("GenerateCommand");
  });

  describe("run", () => {
    it("renders the named generator and reports what it wrote", async () => {
      await command.run([], { generator: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: {
            name: "widget",
            templateDirectoryPath: "configuration/templates/widget",
          },
        }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Generated 1 file(s)"),
      );
    });

    it("writes into the directory the caller named", async () => {
      await command.run([], { directory: "/tmp/out", generator: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({ instancePath: "/tmp/out" }),
      );
    });

    it("falls back to a directory named after the generator", async () => {
      await command.run([], { generator: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({ instancePath: "generated/widget" }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], {
        config: "custom/conformetry.config.ts",
        generator: "widget",
      });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("names the available generators when asked for an unknown one", async () => {
      await expect(command.run([], { generator: "nope" })).rejects.toThrow(
        'Unknown generator "nope". Available: widget',
      );
    });

    it("prompts when attached to a terminal outside CI", async () => {
      const originalIsTty = process.stdin.isTTY;
      const originalCi = process.env["CI"];

      process.stdin.isTTY = true;
      delete process.env["CI"];

      await command.run([], { generator: "widget" });

      expect(inputService.resolveGeneratorInputs).toHaveBeenCalledWith(
        expect.objectContaining({ promptWhenMissing: true }),
      );

      process.stdin.isTTY = originalIsTty;
      if (originalCi !== undefined) process.env["CI"] = originalCi;
    });

    it("never prompts in CI even with a terminal attached", async () => {
      const originalIsTty = process.stdin.isTTY;
      const originalCi = process.env["CI"];

      process.stdin.isTTY = true;
      process.env["CI"] = "true";

      await command.run([], { generator: "widget" });

      expect(inputService.resolveGeneratorInputs).toHaveBeenCalledWith(
        expect.objectContaining({ promptWhenMissing: false }),
      );

      process.stdin.isTTY = originalIsTty;
      if (originalCi === undefined) delete process.env["CI"];
      else process.env["CI"] = originalCi;
    });

    it("never prompts when interaction is declined", async () => {
      await command.run([], { generator: "widget", interactive: false });

      expect(inputService.resolveGeneratorInputs).toHaveBeenCalledWith(
        expect.objectContaining({ promptWhenMissing: false }),
      );
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseDirectory("dir")).toBeDefined();
      expect(command.parseGenerator("widget")).toBeDefined();
      expect(command.parseInteractive()).toBe(false);
    });
  });
});
