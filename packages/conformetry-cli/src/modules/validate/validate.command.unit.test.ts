import {
  ConfigurationService,
  DiscoveryService,
  InputService,
} from "@conformetry/configuration";
import { ReportingService } from "@conformetry/core";
import { ValidationService } from "@conformetry/validation";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { ValidateCommand } from "./validate.command";

import type {
  ConformetryConfiguration,
  InstanceCandidate,
  TemplateDefinition,
} from "@conformetry/configuration";

const CONFIGURATION: ConformetryConfiguration = [
  {
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
];

const CANDIDATE: InstanceCandidate = {
  instancePath: "/w/packages/widgets/src/modules",
  nameStem: "gears",
};

const TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/widget",
  filePaths: [],
  name: "widget",
};

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(ValidateCommand, () => {
  let command: ValidateCommand;
  let configurationService: ConfigurationService;
  let discoveryService: DiscoveryService;
  let commandLogger: LoggerService;
  let validationService: ValidationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: DiscoveryService, useValue: createMock<DiscoveryService>() },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ReportingService, useValue: createMock<ReportingService>() },
        {
          provide: ValidationService,
          useValue: createMock<ValidationService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ValidateCommand);
    configurationService = await module.resolve(ConfigurationService);
    discoveryService = await module.resolve(DiscoveryService);
    commandLogger = await module.resolve(LoggerService);
    validationService = await module.resolve(ValidationService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    process.exitCode = undefined;
    vi.mocked(
      configurationService.loadConformetryConfiguration,
    ).mockResolvedValue(CONFIGURATION);
    vi.mocked(discoveryService.resolveCandidates).mockReturnValue([CANDIDATE]);
    vi.mocked(discoveryService.collectTemplate).mockReturnValue(TEMPLATE);
    vi.mocked(validationService.validate).mockResolvedValue({
      checkedPaths: [],
      fileResults: [],
      ok: true,
      unmatched: [],
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        ValidateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: DiscoveryService, useValue: createMock<DiscoveryService>() },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ReportingService, useValue: createMock<ReportingService>() },
        {
          provide: ValidationService,
          useValue: createMock<ValidationService>(),
        },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ValidateCommand");
  });

  describe("run", () => {
    it("validates the configured instances and reports the outcome", async () => {
      await command.run([], {});

      expect(discoveryService.resolveCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["packages/*/src/modules/*"] }),
      );
      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ candidates: [CANDIDATE] }),
      );
      expect(commandLogger.log).toHaveBeenCalledTimes(1);
    });

    it("lets an explicit glob override the configured instances", async () => {
      await command.run([], { instances: ["tools/*"] });

      expect(discoveryService.resolveCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["tools/*"] }),
      );
    });

    it("passes a group's substitutions to glob expansion", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [
            {
              patterns: ["packages/*"],
              substitutions: { type: "packages" },
            },
          ],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], {});

      expect(discoveryService.resolveCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ substitutions: { type: "packages" } }),
      );
    });

    it("passes a language filter through", async () => {
      await command.run([], { languages: ["typescript"] });

      expect(validationService.validate).toHaveBeenCalledWith(
        expect.objectContaining({ languageNames: ["typescript"] }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], { config: "custom/conformetry.config.ts" });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("fails the command when an instance does not conform", async () => {
      vi.mocked(validationService.validate).mockResolvedValue({
        checkedPaths: [],
        fileResults: [
          {
            errors: [],
            filename: "gears.ts",
            instanceFilePath: "/w/gears.ts",
            templateFilePath: "/w/template.ts",
          },
        ],
        ok: false,
        unmatched: [],
      });

      await expect(command.run([], {})).rejects.toThrow("Validation failed");
      expect(process.exitCode).toBe(1);

      process.exitCode = undefined;
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseInstances("a,b")).toBeDefined();
      expect(command.parseLanguages("typescript")).toBeDefined();
    });
  });
});
