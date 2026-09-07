import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ConfigurationService,
  PROJECT_CONFIGURATION_LIMIT_PERMISSIONS,
} from "@callidescope/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

/** This repository's own workspace configuration, read off disk. */
const WORKSPACE_CONFIGURATION_PATH = path.join(
  fileURLToPath(new URL("../../..", import.meta.url)),
  "configuration",
  "callidescope.config.ts",
);

/**
 * Pins the fact that forbids spreading this repository's workspace limits.
 *
 * `configuration/callidescope.config.ts` tells a project to write only the
 * limits it overrides and never to spread `workspaceLimits`, because that
 * object carries a limit no project may set. A comment cannot hold that on its
 * own: somebody who dropped the workspace-only limit, or who "fixed" the
 * comment into recommending the spread, would leave the two disagreeing and
 * nothing would say so until a project configuration was refused.
 *
 * Read through the real loader rather than imported. The workspace root is not
 * a project any test suite runs in, and a static import of a root configuration
 * file makes the importing project depend on the root project — which closes a
 * cycle back through `@callidescope/nx` and fails module boundaries. A path and
 * the loader every run already uses cost nothing and prove more.
 *
 * `authored` rather than the resolved configuration, for the same reason
 * `ProjectConfigurationService` checks a refusal against it: resolution
 * manufactures every limit, so the resolved object can never say no.
 */
describe("workspace limits", () => {
  let configurationService: ConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationService],
    }).compile();

    configurationService = await module.resolve(ConfigurationService);
  });

  it("carries a limit no project configuration is allowed to set", async () => {
    const { authored } = await configurationService.loadConfigurationFile({
      configurationPath: WORKSPACE_CONFIGURATION_PATH,
    });

    const forbidden = Object.entries(PROJECT_CONFIGURATION_LIMIT_PERMISSIONS)
      .filter(([, permission]) => permission === "forbidden")
      .map(([limit]) => limit)
      .filter((limit) => Object.hasOwn(authored.limits ?? {}, limit));

    // Named rather than merely non-empty: an assertion that the list is not
    // `[]` also passes for a list that is not a list at all, and says nothing
    // about which limit is the one the comment in that file is about.
    expect(forbidden).toContain("spreadThreshold");
  });
});
