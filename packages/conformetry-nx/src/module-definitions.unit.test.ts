import { describe, expect, it } from "vitest";

import { CommandExecutionModule } from "./modules/command-execution/command-execution.module";
import { CommandRunnerModule } from "./modules/command-runner/command-runner.module";
import { GenerationModule } from "./modules/generation/generation.module";
import { PluginOptionsModule } from "./modules/plugin-options/plugin-options.module";
import { ValidationTargetModule } from "./modules/validation-target/validation-target.module";
import { ValidationModule } from "./modules/validation/validation.module";
import { WorkspaceGeneratorModule } from "./modules/workspace-generator/workspace-generator.module";

describe("module definitions", () => {
  it("exports all conformetry-nx feature modules", () => {
    expect(CommandExecutionModule).toBeDefined();
    expect(CommandRunnerModule).toBeDefined();
    expect(GenerationModule).toBeDefined();
    expect(PluginOptionsModule).toBeDefined();
    expect(ValidationModule).toBeDefined();
    expect(ValidationTargetModule).toBeDefined();
    expect(WorkspaceGeneratorModule).toBeDefined();
  });
});
