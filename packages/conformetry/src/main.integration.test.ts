import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./modules/commands/generate/generate.command.js", () => {
  function MockGenerateCommand(): void {}

  return {
    GenerateCommand: MockGenerateCommand,
  };
});

vi.mock("./modules/commands/validate/validate.command.js", () => {
  function MockValidateCommand(): void {}

  return {
    ValidateCommand: MockValidateCommand,
  };
});

describe("module export surfaces", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports command and module surfaces for nx handoff", async () => {
    const { MainModule } = await import("./main.module.js");
    const { GenerateCommand } =
      await import("./modules/commands/generate/generate.command.js");
    const { GenerateModule } =
      await import("./modules/commands/generate/generate.module.js");
    const { ValidateCommand } =
      await import("./modules/commands/validate/validate.command.js");
    const { ValidateModule } =
      await import("./modules/commands/validate/validate.module.js");

    expect(MainModule).toBeDefined();
    expect(GenerateCommand).toBeDefined();
    expect(GenerateModule).toBeDefined();
    expect(ValidateCommand).toBeDefined();
    expect(ValidateModule).toBeDefined();
  });

  it("exports nest modules used by command bootstrap", async () => {
    const { LoggerModule } = await import("./modules/logger/logger.module.js");

    expect(LoggerModule).toBeDefined();
  });
});
