import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  function MockConfigurationModule(): void {}
  function MockConfigurationService(): void {}

  function parseCommaDelimitedOption(
    value: string | undefined,
  ): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return {
    collectGeneratorInputsFromCommandArguments: vi.fn<
      () => Record<string, never>
    >(() => {
      return {};
    }),
    ConfigurationModule: MockConfigurationModule,
    ConfigurationService: MockConfigurationService,
    parseCommaDelimitedOption,
  };
});

vi.mock("@jimmypaolini/conformetry-generation", () => {
  function MockGenerationModule(): void {}
  function MockGenerationService(): void {}

  return {
    GenerationModule: MockGenerationModule,
    GenerationService: MockGenerationService,
  };
});

vi.mock("@jimmypaolini/conformetry-validation", () => {
  function MockValidationModule(): void {}
  function MockValidationService(): void {}

  return {
    ValidationModule: MockValidationModule,
    ValidationService: MockValidationService,
  };
});

vi.mock("./modules/generate/generate.command.js", () => {
  function MockGenerateCommand(): void {}

  return {
    GenerateCommand: MockGenerateCommand,
  };
});

vi.mock("./modules/validate/validate.command.js", () => {
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
    const { MainModule } = await import("./main.module");
    const { GenerateCommand } =
      await import("./modules/generate/generate.command");
    const { GenerateModule } =
      await import("./modules/generate/generate.module");
    const { ValidateCommand } =
      await import("./modules/validate/validate.command");
    const { ValidateModule } =
      await import("./modules/validate/validate.module");

    expect(MainModule).toBeDefined();
    expect(GenerateCommand).toBeDefined();
    expect(GenerateModule).toBeDefined();
    expect(ValidateCommand).toBeDefined();
    expect(ValidateModule).toBeDefined();
  });

  it("exports nest modules used by command bootstrap", async () => {
    const { LoggerModule } = await import("./modules/logger/logger.module");

    expect(LoggerModule).toBeDefined();
  });
});
