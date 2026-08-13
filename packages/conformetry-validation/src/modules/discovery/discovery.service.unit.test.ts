import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryService } from "./discovery.service";

async function createWorkspace(
  projects: { name: string; root: string; tags?: string[] }[],
): Promise<string> {
  const workspace = await mkdtemp(path.join(tmpdir(), "conformetry-scan-"));

  for (const project of projects) {
    const projectPath = path.join(workspace, project.root);

    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({ name: project.name, tags: project.tags ?? [] }),
      "utf8",
    );
  }

  return workspace;
}

describe(DiscoveryService, () => {
  let service: DiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryService],
    }).compile();

    service = await module.resolve(DiscoveryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds every project and sorts by root path", async () => {
    const workspace = await createWorkspace([
      { name: "beta", root: "packages/beta" },
      { name: "alpha", root: "applications/alpha" },
    ]);

    expect(
      service.discoverProjects(workspace).map((project) => project.rootPath),
    ).toStrictEqual(["applications/alpha", "packages/beta"]);
  });

  it("reads a project's tags", async () => {
    const workspace = await createWorkspace([
      { name: "alpha", root: "packages/alpha", tags: ["generator:x"] },
    ]);

    expect(service.discoverProjects(workspace)[0]?.tags).toStrictEqual([
      "generator:x",
    ]);
  });

  it("skips template directories, which are not real projects", async () => {
    const workspace = await createWorkspace([
      { name: "alpha", root: "packages/alpha" },
      {
        name: "tpl",
        root: "configuration/conformetry-templates/nestjs-service-project",
      },
    ]);

    expect(
      service.discoverProjects(workspace).map((project) => project.name),
    ).toStrictEqual(["alpha"]);
  });

  it("skips a project.json that will not parse", async () => {
    const workspace = await createWorkspace([
      { name: "alpha", root: "packages/alpha" },
    ]);
    const brokenPath = path.join(workspace, "packages", "broken");

    await mkdir(brokenPath, { recursive: true });
    await writeFile(path.join(brokenPath, "project.json"), "{oops", "utf8");

    expect(service.discoverProjects(workspace)).toHaveLength(1);
  });

  it("normalizes paths to workspace-relative POSIX form", () => {
    expect(service.normalizePath("./packages/alpha")).toBe("packages/alpha");
  });
});
