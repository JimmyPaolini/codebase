import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { WorkspaceService } from "./workspace.service";

import type { WorkspaceProject } from "./workspace.types";

const PROJECT: WorkspaceProject = {
  configurationPath: "/workspace/packages/example/tsconfig.json",
  name: "example",
  root: "packages/example",
};

/** Writes a workspace holding the named projects, and returns its root. */
async function buildWorkspace(
  projects: { container: string; manifest?: string; name: string }[],
): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "callidescope-workspace-"));

  for (const project of projects) {
    const directory = path.join(root, project.container, project.name);

    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "project.json"),
      project.manifest ?? JSON.stringify({ name: project.name }),
      "utf8",
    );
    await writeFile(path.join(directory, "tsconfig.json"), "{}", "utf8");
  }

  return root;
}

describe(WorkspaceService, () => {
  let service: WorkspaceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [WorkspaceService],
    }).compile();

    service = await module.resolve(WorkspaceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subject = new WorkspaceService();

  // 📂 Project discovery

  it("finds a project in each container directory", async () => {
    const root = await buildWorkspace([
      { container: "applications", name: "app" },
      { container: "packages", name: "library" },
      { container: "tools", name: "utility" },
    ]);

    const projects = subject.discoverProjects({
      projectNames: [],
      workspaceRoot: root,
    });

    expect(projects.map((project) => project.name)).toStrictEqual([
      "app",
      "library",
      "utility",
    ]);
  });

  it("returns projects in a stable order regardless of the filesystem", async () => {
    // Ownership ties break on this order, so an unstable one would make depth
    // numbers differ between runs.
    const root = await buildWorkspace([
      { container: "packages", name: "zebra" },
      { container: "packages", name: "alpha" },
    ]);

    expect(
      service
        .discoverProjects({ projectNames: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["alpha", "zebra"]);
  });

  it("keeps only the projects that were asked for", async () => {
    const root = await buildWorkspace([
      { container: "packages", name: "wanted" },
      { container: "packages", name: "ignored" },
    ]);

    expect(
      service
        .discoverProjects({ projectNames: ["wanted"], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["wanted"]);
  });

  it("skips a project with no tsconfig, which cannot become a program", async () => {
    const root = await buildWorkspace([
      { container: "packages", name: "typed" },
    ]);
    const untyped = path.join(root, "packages", "untyped");

    await mkdir(untyped, { recursive: true });
    await writeFile(
      path.join(untyped, "project.json"),
      JSON.stringify({ name: "untyped" }),
      "utf8",
    );

    expect(
      service
        .discoverProjects({ projectNames: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["typed"]);
  });

  it("falls back to the directory name when a manifest is unreadable", async () => {
    const root = await buildWorkspace([
      { container: "packages", manifest: "{ not json", name: "broken" },
    ]);

    expect(
      service
        .discoverProjects({ projectNames: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["broken"]);
  });

  it("falls back to the directory name when a manifest names nothing", async () => {
    const root = await buildWorkspace([
      { container: "packages", manifest: "{}", name: "unnamed" },
    ]);

    expect(
      service
        .discoverProjects({ projectNames: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["unnamed"]);
  });

  it("finds nothing in a workspace with no container directories", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-empty-"));

    expect(
      subject.discoverProjects({ projectNames: [], workspaceRoot: root }),
    ).toStrictEqual([]);
  });

  // 🏷️ Module identity

  it("names a module folder by its own directory", () => {
    expect(
      subject.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath:
          "packages/example/src/modules/discovery/discovery.service.ts",
      }),
    ).toBe("example:modules/discovery");
  });

  it("names another src subtree by its first directory", () => {
    expect(
      subject.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath: "packages/example/src/routes/index.tsx",
      }),
    ).toBe("example:routes");
  });

  it("names a file directly under src by the src root", () => {
    expect(
      subject.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath: "packages/example/src/main.ts",
      }),
    ).toBe("example:src");
  });

  it("names a file outside src by the src root", () => {
    expect(
      subject.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath: "packages/example/scripts/build.ts",
      }),
    ).toBe("example:src");
  });

  // 🧪 Test detection

  it.each([
    "example.unit.test.ts",
    "example.integration.test.ts",
    "example.end-to-end.test.ts",
    "example.test.ts",
    "example.spec.tsx",
  ])("recognizes %s as a test file", (fileName) => {
    expect(subject.isTestFile(fileName)).toBe(true);
  });

  it.each([
    "packages/example/testing/mocks.ts",
    "packages/example/testing/setup.ts",
  ])("recognizes %s as test scaffolding", (filePath) => {
    expect(subject.isTestFile(filePath)).toBe(true);
  });

  it("does not mistake a directory merely containing the word", () => {
    expect(subject.isTestFile("packages/testing-library/src/a.ts")).toBe(false);
  });

  it("does not mistake a service for a test", () => {
    expect(subject.isTestFile("example.service.ts")).toBe(false);
  });

  // 🙈 Exclusions

  it("excludes a path matching a configured glob", () => {
    const filter = subject.buildFileFilter({
      exclude: ["**/generated/**"],
      excludeFrom: [],
      workspaceRoot: "/workspace",
    });

    expect(filter.isExcluded("packages/example/src/generated/api.ts")).toBe(
      true,
    );
    expect(filter.isExcluded("packages/example/src/api.ts")).toBe(false);
  });

  it("warns and continues when an ignore file is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-ignore-"));
    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: root,
    });

    expect(filter.isExcluded("packages/example/src/a.ts")).toBe(false);
  });

  it("survives an ignore file git cannot apply", async () => {
    // No git repository here, so `git ls-files` fails — which must degrade to
    // "nothing ignored" rather than taking the run down.
    const root = await mkdtemp(
      path.join(tmpdir(), "callidescope-unversioned-"),
    );

    await mkdir(path.join(root, "configuration"), { recursive: true });
    await writeFile(
      path.join(root, "configuration", ".callidescopeignore"),
      "**/*.test.ts\n",
      "utf8",
    );

    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot: root,
    });

    expect(filter.isExcluded("packages/example/src/a.ts")).toBe(false);
  });

  it("applies an ignore file through git", () => {
    // Run against this repository, which is the only place `git ls-files` has
    // anything to report — the branch that actually collects ignored paths.
    const workspaceRoot = path.resolve(process.cwd(), "..", "..");
    const filter = subject.buildFileFilter({
      exclude: [],
      excludeFrom: ["configuration/.callidescopeignore"],
      workspaceRoot,
    });

    // Git only reports paths it tracks, so the assertion names one that
    // exists rather than one the pattern would merely have matched.
    expect(filter.isExcluded("applications/lexico/src/routeTree.gen.ts")).toBe(
      true,
    );
    expect(filter.isExcluded("packages/callidescope-cli/src/main.ts")).toBe(
      false,
    );
  });

  // 🧭 Paths

  it("rewrites an absolute path as workspace-relative", () => {
    expect(
      subject.toWorkspaceRelative({
        absolutePath: path.join("/workspace", "packages", "example", "a.ts"),
        workspaceRoot: "/workspace",
      }),
    ).toBe("packages/example/a.ts");
  });
});
