import { ConfigurationService, InputService } from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ListCommand } from "./list.command";

import type { ConformetryConfiguration } from "@conformetry/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

const CONFIGURATION: ConformetryConfiguration = [
  {
    aliases: ["w", "wdg"],
    description: "Generate a widget",
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
  {
    inputs: {},
    instances: [],
    name: "gadget",
    templatePath: "configuration/templates/gadget",
  },
];

/** Standard output collected during one test. */
const output: string[] = [];

/** Every line the command wrote, joined so a single assertion can span lines. */
const written = (): string => output.join("\n");

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(ListCommand, () => {
  let command: ListCommand;
  let configurationService: DeepMocked<ConfigurationService>;
  let commandLogger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(ListCommand);
    configurationService = await module.resolve(ConfigurationService);
    commandLogger = await module.resolve(LoggerService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    // Another command's tests set this global; reset it so the assertion below
    // measures this command rather than whatever ran before it.
    process.exitCode = undefined;
    output.length = 0;
    vi.spyOn(console, "info").mockImplementation((...data: unknown[]) => {
      output.push(data.map(String).join(" "));
    });
    configurationService.loadConformetryConfiguration.mockResolvedValue(
      CONFIGURATION,
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        ListCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ListCommand");
  });

  describe("run", () => {
    it("names every declared generator", async () => {
      await command.run([], {});

      expect(written()).toContain("widget");
      expect(written()).toContain("gadget");
    });

    it("reports a generator's aliases, description and template", async () => {
      await command.run([], {});
      const lines = written();

      expect(lines).toContain("w, wdg");
      expect(lines).toContain("Generate a widget");
      expect(lines).toContain("configuration/templates/widget");
    });

    it("names a generator that declares neither aliases nor a description", async () => {
      await command.run([], {});
      const lines = written();

      expect(lines).toContain("gadget");
      expect(lines).toContain("configuration/templates/gadget");
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], { config: "custom/conformetry.config.ts" });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("reads a default configuration path when none is named", async () => {
      await command.run([], {});

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith(expect.stringContaining("conformetry.config"));
    });

    it("says so when the configuration declares no generators", async () => {
      configurationService.loadConformetryConfiguration.mockResolvedValue([]);

      await command.run([], {});

      expect(written()).toContain("No generators");
    });

    // The shared logger asserts every message opens with an emoji and a verb,
    // which is why the report-printing commands throw outside production.
    // Program output is not a log line, so it must not go through the logger.
    it("writes program output without going through the logger", async () => {
      await command.run([], {});

      expect(output).not.toHaveLength(0);
      expect(commandLogger.log).not.toHaveBeenCalled();
    });

    it("does not fail the command", async () => {
      await command.run([], {});

      expect(process.exitCode).toBeUndefined();
    });
  });

  describe("machine-readable output", () => {
    it("writes parseable output carrying every generator", async () => {
      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([
        {
          aliases: ["w", "wdg"],
          description: "Generate a widget",
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
        {
          aliases: [],
          description: "",
          name: "gadget",
          templatePath: "configuration/templates/gadget",
        },
      ]);
    });

    it("writes an empty collection when nothing is declared", async () => {
      configurationService.loadConformetryConfiguration.mockResolvedValue([]);

      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([]);
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseJson()).toBe(true);
    });
  });
});
