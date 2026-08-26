import { describe, expect, it } from "vitest";

import { OptionsService } from "./modules/options/options.service";
import { PluginService } from "./modules/plugin/plugin.service";
import { ProjectsService } from "./modules/projects/projects.service";
import {
  resolveOptionsService,
  resolvePluginService,
  resolveProjectsService,
} from "./plugin-context.utilities";

describe("plugin context", () => {
  it("resolves every service the plugin entry points reach for", async () => {
    expect.hasAssertions();

    await expect(resolveOptionsService()).resolves.toBeInstanceOf(
      OptionsService,
    );
    await expect(resolvePluginService()).resolves.toBeInstanceOf(PluginService);
    await expect(resolveProjectsService()).resolves.toBeInstanceOf(
      ProjectsService,
    );
  });

  it("builds the application context once per process", async () => {
    expect.hasAssertions();

    // The Nx daemon is long-lived, so a context per invocation would make this
    // plugin the slowest thing in the graph.
    await expect(resolvePluginService()).resolves.toBe(
      await resolvePluginService(),
    );
  });
});
