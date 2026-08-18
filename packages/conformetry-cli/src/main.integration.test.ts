import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MainModule } from "./main.module";
import { ExplainCommand } from "./modules/explain/explain.command";
import { GenerateCommand } from "./modules/generate/generate.command";
import { ListCommand } from "./modules/list/list.command";
import { ValidateCommand } from "./modules/validate/validate.command";

import type { TestingModule } from "@nestjs/testing";

/**
 * Boots the real module graph rather than mocking the packages.
 *
 * Mocked module stubs cannot catch the failure that matters here: a command
 * whose dependencies resolve to `undefined` still constructs fine and only
 * fails when a method is called. Compiling the actual graph is what proves
 * the wiring.
 */
describe(MainModule, () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it("compiles the whole application graph", () => {
    expect(module).toBeDefined();
  });

  it("resolves the explain command with every dependency injected", async () => {
    const command = await module.resolve(ExplainCommand);

    expect(command).toBeDefined();
    expect(command.parseConfig("custom/conformetry.config.ts")).toBe(
      "custom/conformetry.config.ts",
    );
  });

  it("resolves the generate command with every dependency injected", async () => {
    const command = await module.resolve(GenerateCommand);

    expect(command).toBeDefined();
    expect(command.parseGenerator("example")).toBe("example");
  });

  it("resolves the list command with every dependency injected", async () => {
    const command = await module.resolve(ListCommand);

    expect(command).toBeDefined();
    expect(command.parseConfig("custom/conformetry.config.ts")).toBe(
      "custom/conformetry.config.ts",
    );
  });

  it("resolves the validate command with every dependency injected", async () => {
    const command = await module.resolve(ValidateCommand);

    expect(command).toBeDefined();
    expect(command.parseLanguages("typescript")).toStrictEqual(["typescript"]);
  });
});
