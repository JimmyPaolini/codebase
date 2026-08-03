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

  it("exports integration module/service for nx handoff", async () => {
    const { IntegrationModule } =
      await import("./modules/integration/integration.module.js");
    const { IntegrationService } =
      await import("./modules/integration/integration.service.js");

    expect(IntegrationModule).toBeDefined();
    expect(IntegrationService).toBeDefined();
  });

  it("exports nest modules used by command bootstrap", async () => {
    const { MainModule } = await import("./main.module.js");
    const { GenerateModule } =
      await import("./modules/commands/generate/generate.module.js");
    const { ValidateModule } =
      await import("./modules/commands/validate/validate.module.js");
    const { LoggerModule } = await import("./modules/logger/logger.module.js");

    expect(MainModule).toBeDefined();
    expect(GenerateModule).toBeDefined();
    expect(ValidateModule).toBeDefined();
    expect(LoggerModule).toBeDefined();
  });
});
