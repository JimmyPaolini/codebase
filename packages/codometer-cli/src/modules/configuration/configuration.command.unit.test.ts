import { InputService } from "@codometer/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { ConfigurationCommand } from "./configuration.command";
import { ConfigurationService } from "./configuration.service";
import { RenderConfigurationService } from "./render-configuration.service";

describe(ConfigurationCommand, () => {
  let command: ConfigurationCommand;
  let configurationService: ConfigurationService;
  let renderConfigurationService: RenderConfigurationService;
  let logger: LoggerService;
  let write: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationCommand,
        InputService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: RenderConfigurationService,
          useValue: createMock<RenderConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ConfigurationCommand);
    configurationService = module.get(ConfigurationService);
    renderConfigurationService = module.get(RenderConfigurationService);
    logger = module.get(LoggerService);
  });

  beforeEach(() => {
    vi.mocked(configurationService.describeConfigurations).mockResolvedValue(
      [],
    );
    vi.mocked(configurationService.toLimitRows).mockReturnValue([]);
    vi.mocked(renderConfigurationService.render).mockReturnValue("rendered");
    write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationCommand,
        InputService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: RenderConfigurationService,
          useValue: createMock<RenderConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ConfigurationCommand");
  });

  it("writes the rendered listing to standard output", async () => {
    await command.run([], {});

    expect(write).toHaveBeenCalledWith("rendered\n");
  });

  it("passes the limits flag through to the renderer", async () => {
    await command.run([], { limits: true });

    expect(renderConfigurationService.render).toHaveBeenCalledWith(
      expect.objectContaining({ limitsOnly: true }),
    );
  });

  it("reads the directory it is given, and falls back to the working directory", () => {
    expect(command.parseDirectory("packages/logger")).toBe("packages/logger");
    expect(command.parseDirectory("")).toBe(process.cwd());
    expect(command.parseDirectory(true)).toBe(process.cwd());
  });

  it("reads the format it is given, and falls back to markdown", () => {
    expect(command.parseFormat("json")).toBe("json");
    expect(command.parseFormat("")).toBe("markdown");
    expect(command.parseFormat(undefined)).toBe("markdown");
  });

  it("reads the limits flag as set whenever it is present", () => {
    expect(command.parseLimits(undefined)).toBe(true);
  });

  it("counts the configurations it could not read when it logs", async () => {
    vi.mocked(configurationService.describeConfigurations).mockResolvedValue([
      {
        configuration: undefined,
        directory: "packages/broken",
        error: "Cannot find module",
        path: "packages/broken/codometer.config.ts",
      },
    ]);

    await command.run([], {});

    expect(logger.info).toHaveBeenCalledWith(
      "🔧 Listed the codometer configuration",
      undefined,
      { configurationCount: 1, unreadableCount: 1 },
    );
  });

  it("refuses a format it does not know, naming the ones it takes", async () => {
    await expect(command.run([], { format: "yaml" })).rejects.toThrow(
      '--format does not accept "yaml". It takes one of json and markdown.',
    );
  });

  it("defaults the format to markdown", async () => {
    await command.run([], {});

    expect(renderConfigurationService.render).toHaveBeenCalledWith(
      expect.objectContaining({ format: "markdown" }),
    );
  });
});
