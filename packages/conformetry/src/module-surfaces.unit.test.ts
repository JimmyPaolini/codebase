import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./modules/commands/generate.command.js", () => {
  function MockGenerateCommand(): void {}

  return {
    GenerateCommand: MockGenerateCommand,
  };
});

vi.mock("./modules/commands/validate.command.js", () => {
  function MockValidateCommand(): void {}

  return {
    ValidateCommand: MockValidateCommand,
  };
});

describe("module export surfaces", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports nest modules used by command bootstrap", async () => {
    const { MainModule } = await import("./main.module.js");
    const { CommandsModule } =
      await import("./modules/commands/commands.module.js");
    const { LoggerModule } = await import("./modules/logger/logger.module.js");

    expect(MainModule).toBeDefined();
    expect(CommandsModule).toBeDefined();
    expect(LoggerModule).toBeDefined();
  });
});
