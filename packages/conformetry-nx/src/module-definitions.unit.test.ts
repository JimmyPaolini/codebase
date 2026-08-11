import { describe, expect, it } from "vitest";

import { CommandExecutionModule } from "./modules/command-execution/command-execution.module.js";
import { CommandRunnerModule } from "./modules/command-runner/command-runner.module.js";
import { GenerationModule } from "./modules/generation/generation.module.js";
import { PluginOptionsModule } from "./modules/plugin-options/plugin-options.module.js";
import { ValidationTargetModule } from "./modules/validation-target/validation-target.module.js";
import { ValidationModule } from "./modules/validation/validation.module.js";
import { WorkspaceGeneratorModule } from "./modules/workspace-generator/workspace-generator.module.js";

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
