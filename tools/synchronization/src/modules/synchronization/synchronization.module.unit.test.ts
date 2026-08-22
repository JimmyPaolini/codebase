import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { NestjsModuleGraphsModule } from "../nestjs-module-graphs/nestjs-module-graphs.module";
import { NxProjectGraphsModule } from "../nx-project-graphs/nx-project-graphs.module";
import { PullRequestLabelsModule } from "../pull-request-labels/pull-request-labels.module";
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
    expect(imports).toContain(ConformetryGeneratorsModule);
    expect(imports).toContain(ConventionalConfigModule);
    expect(imports).toContain(DevcontainerConfigurationModule);
    expect(imports).toContain(NestjsModuleGraphsModule);
    expect(imports).toContain(NxProjectGraphsModule);
    expect(imports).toContain(PullRequestLabelsModule);
    expect(imports).toContain(PullRequestTemplateModule);

    expect(providers).toBeDefined();
    expect(providers).toContain(SynchronizationService);
  });
});
