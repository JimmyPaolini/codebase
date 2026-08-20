import { InputService } from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { InventoryService } from "../inventory/inventory.service";

import { TemplatesCommand } from "./templates.command";

import type { InventoriedTemplate } from "../inventory/inventory.types.js";
import type { DeepMocked } from "@golevelup/ts-vitest";

const COMMAND_MODULE: InventoriedTemplate = {
  aliases: ["ncm"],
  description: "Generate a NestJS command module",
  instances: [
    {
      matchedFileCount: 5,
      matchRatio: 1,
      name: "packages/widgets/src/modules/gears",
      templateFileCount: 5,
    },
  ],
  name: "nestjs-command-module",
  templatePath: "configuration/templates/nestjs-command-module",
};

const SERVICE_MODULE: InventoriedTemplate = {
  aliases: [],
  description: "",
  instances: [
    {
      matchedFileCount: 3,
      matchRatio: 0.6,
      name: "packages/widgets/src/modules/gears",
      templateFileCount: 5,
    },
  ],
  name: "nestjs-service-module",
  templatePath: "configuration/templates/nestjs-service-module",
};

/** Standard output collected during one test. */
const output: string[] = [];

/** Every line the command wrote, joined so a single assertion can span lines. */
const written = (): string => output.join("\n");

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(TemplatesCommand, () => {
  let command: TemplatesCommand;
  let inventoryService: DeepMocked<InventoryService>;
  let commandLogger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TemplatesCommand,
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: InventoryService, useValue: createMock<InventoryService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(TemplatesCommand);
    inventoryService = await module.resolve(InventoryService);
    commandLogger = await module.resolve(LoggerService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    process.exitCode = undefined;
    output.length = 0;
    vi.spyOn(console, "info").mockImplementation((...data: unknown[]) => {
      output.push(data.map(String).join(" "));
    });
    inventoryService.resolveTemplates.mockResolvedValue([
      COMMAND_MODULE,
      SERVICE_MODULE,
    ]);
    inventoryService.formatPercentage.mockImplementation(
      (ratio: number) => `${String(Math.round(ratio * 100))}%`,
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
        TemplatesCommand,
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: InventoryService, useValue: createMock<InventoryService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("TemplatesCommand");
  });

  describe("run", () => {
    it("names every declared template with its aliases and folder", async () => {
      await command.run([], {});
      const lines = written();

      expect(lines).toContain("nestjs-command-module (ncm)");
      expect(lines).toContain("Generate a NestJS command module");
      expect(lines).toContain("configuration/templates/nestjs-command-module");
    });

    it("names a template that declares neither aliases nor a description", async () => {
      await command.run([], {});

      expect(written()).toContain("nestjs-service-module");
    });

    // A bare listing is a registry; naming every instance of every template
    // would bury the names somebody actually asked for.
    it("omits instances unless the caller narrowed by path", async () => {
      await command.run([], {});

      expect(written()).not.toContain("Instances:");
    });

    it("reports which templates explain a path, and how well", async () => {
      await command.run([], {
        instances: ["packages/widgets/src/modules/gears"],
      });
      const lines = written();

      expect(lines).toContain("Instances:");
      expect(lines).toContain("5/5 files 100%");
      expect(lines).toContain("3/5 files 60%");
    });

    // Nothing records where an instance came from, so a path legitimately
    // belongs to more than one template and every one is reported.
    it("reports every template a path belongs to, not just the best fit", async () => {
      await command.run([], {
        instances: ["packages/widgets/src/modules/gears"],
      });
      const lines = written();

      expect(lines).toContain("nestjs-command-module");
      expect(lines).toContain("nestjs-service-module");
    });

    it("passes the path filter through as instance patterns", async () => {
      await command.run([], { instances: ["packages/*", "tools/*"] });

      expect(inventoryService.resolveTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          instancePatterns: ["packages/*", "tools/*"],
        }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], { config: "custom/conformetry.config.ts" });

      expect(inventoryService.resolveTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          configurationPath: "custom/conformetry.config.ts",
        }),
      );
    });

    it("says so when the configuration declares no templates", async () => {
      inventoryService.resolveTemplates.mockResolvedValue([]);

      await command.run([], {});

      expect(written()).toContain("No templates");
    });

    it("distinguishes an unexplained path from an empty configuration", async () => {
      inventoryService.resolveTemplates.mockResolvedValue([]);

      await command.run([], { instances: ["packages/widgets/nowhere"] });

      expect(written()).toContain("No template explains those paths");
    });

    // The shared logger asserts every message opens with an emoji and a verb,
    // which is why the report-printing commands throw outside production.
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
    it("writes parseable output carrying every template", async () => {
      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([
        COMMAND_MODULE,
        SERVICE_MODULE,
      ]);
    });

    it("writes an empty collection when nothing is declared", async () => {
      inventoryService.resolveTemplates.mockResolvedValue([]);

      await command.run([], { json: true });

      expect(JSON.parse(written())).toStrictEqual([]);
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseJson()).toBe(true);
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseInstances("a,b")).toBeDefined();
    });
  });
});
