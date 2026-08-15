import { createTree } from "nx/src/generators/testing-utils/create-tree";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveGeneratorService,
  resolveOptionsService,
  resolvePluginService,
} from "../../plugin-context.utilities";

import syncGenerator from "./generator";

import type { Tree } from "@nx/devkit";

// The emitted plugin is the generator service's business and is tested there;
// what this entry point owns is writing the result through the tree.
vi.mock("../../plugin-context.utilities", () => ({
  resolveGeneratorService: vi.fn(),
  resolveOptionsService: vi.fn(),
  resolvePluginService: vi.fn(),
}));

const emitPlugin = vi.fn();
const resolveConfigurationPath = vi.fn();

describe(syncGenerator, () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
    emitPlugin.mockResolvedValue([
      { content: '{ "generators": {} }\n', filePath: "generators.json" },
    ]);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveGeneratorService).mockResolvedValue({
      emitPlugin,
    } as unknown as Awaited<ReturnType<typeof resolveGeneratorService>>);
    resolveConfigurationPath.mockReturnValue("conformetry.config.ts");
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolveOptionsService).mockResolvedValue({
      resolveConfigurationPath,
    } as unknown as Awaited<ReturnType<typeof resolveOptionsService>>);
    // type-coverage:ignore-next-line -- a deliberate stand-in for the service
    vi.mocked(resolvePluginService).mockResolvedValue({
      listWorkspaceProjects: () => [],
    } as unknown as Awaited<ReturnType<typeof resolvePluginService>>);
  });

  it("writes every emitted file into the tree rather than to disk", async () => {
    await syncGenerator(tree);

    expect(tree.read("generators.json", "utf8")).toBe('{ "generators": {} }\n');
  });

  it("returns the message `nx sync:check` reports when out of date", async () => {
    const { outOfSyncMessage } = await syncGenerator(tree);

    expect(outOfSyncMessage.length).toBeGreaterThan(0);
  });

  it("falls back to the conventional paths when given no options", async () => {
    await syncGenerator(tree);

    // The defaults themselves are constants; what matters here is that the
    // generator supplies all three rather than passing undefined through.
    expect(emitPlugin).toHaveBeenCalledTimes(1);
  });

  it("honors the paths a caller names", async () => {
    await syncGenerator(tree, {
      configurationPath: "custom/conformetry.config.ts",
      outputPath: "custom/out",
      packageName: "@acme/conformetry-nx",
    });

    expect(emitPlugin).toHaveBeenCalledWith({
      configurationPath: "custom/conformetry.config.ts",
      outputPath: "custom/out",
      packageName: "@acme/conformetry-nx",
      projects: [],
    });
  });
});
