import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ConfigurationModule } from "./configuration.module";
import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

describe(ConfigurationModule, () => {
  it("exports and provides both configuration services", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ConfigurationModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ConfigurationModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ConfigurationService);
    expect(exportsMetadata).toContain(ProjectConfigurationService);
    expect(providersMetadata).toContain(ConfigurationService);
    expect(providersMetadata).toContain(ProjectConfigurationService);
  });
});
