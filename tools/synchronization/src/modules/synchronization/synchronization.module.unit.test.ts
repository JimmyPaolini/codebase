import { describe, expect, it } from "vitest";

import { AgentSkillsModule } from "../agent-skills/agent-skills.module";
import { ConformanceGeneratorsModule } from "../conformance-generators/conformance-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { LoggerModule } from "../logger/logger.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";

import { SynchronizationModule } from "./synchronization.module";
import { SynchronizationService } from "./synchronization.service";

describe(SynchronizationModule, () => {
  it("registers expected imports and providers", () => {
    const imports = Reflect.getMetadata("imports", SynchronizationModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      SynchronizationModule,
    ) as undefined | unknown[];

    expect(imports).toBeDefined();
    expect(imports).toContain(LoggerModule);
    expect(imports).toContain(AgentSkillsModule);
    expect(imports).toContain(ConformanceGeneratorsModule);
    expect(imports).toContain(ConventionalConfigModule);
    expect(imports).toContain(DevcontainerConfigurationModule);
    expect(imports).toContain(PullRequestTemplateModule);

    expect(providers).toBeDefined();
    expect(providers).toContain(SynchronizationService);
  });
});
