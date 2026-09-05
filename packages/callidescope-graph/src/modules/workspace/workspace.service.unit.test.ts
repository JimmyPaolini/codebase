import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { WorkspaceService } from "./workspace.service";

import type { WorkspaceProject } from "./workspace.types";
import type { LoggerService } from "@codebase/logger";
import type { DeepMocked } from "@golevelup/ts-vitest";

const PROJECT: WorkspaceProject = {
  configurationPath: "/workspace/packages/example/tsconfig.json",
  name: "example",
  root: "packages/example",
};

/** Writes a workspace holding a `tsconfig.json` at each relative path. */
async function buildWorkspace(projectRoots: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "callidescope-workspace-"));

  for (const projectRoot of projectRoots) {
    const directory = path.join(root, projectRoot);

    await mkdir(directory, { recursive: true });
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

  const subjectLogger: DeepMocked<LoggerService> = createMock<LoggerService>();
  const subject = new WorkspaceService(subjectLogger);

  // 📂 Project discovery

  it("traces exactly the directories it was given", async () => {
    const root = await buildWorkspace(["packages/wanted", "packages/other"]);

    expect(
      subject
        .discoverProjects({
          directories: ["packages/wanted"],
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/wanted"]);
  });

  it("resolves an absolute directory against the workspace root", async () => {
    const root = await buildWorkspace(["packages/wanted"]);

    expect(
      subject
        .discoverProjects({
          directories: [path.join(root, "packages/wanted")],
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/wanted"]);
  });

  it("skips a named directory with no tsconfig, and warns why", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-untyped-"));

    await mkdir(path.join(root, "packages", "untyped"), { recursive: true });

    expect(
      subject.discoverProjects({
        directories: ["packages/untyped"],
        workspaceRoot: root,
      }),
    ).toStrictEqual([]);
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped a directory without a tsconfig.json",
      undefined,
      { root: "packages/untyped" },
    );
  });

  it("finds every tsconfig.json in the workspace when none are named", async () => {
    const root = await buildWorkspace([
      "applications/app",
      "packages/library",
      "tools/utility",
    ]);

    expect(
      service
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["applications/app", "packages/library", "tools/utility"]);
  });

  it("returns projects in a stable order regardless of the filesystem", async () => {
    // A report's per-project rows read off this order, so an unstable one
    // would make output differ between runs even when nothing changed.
    const root = await buildWorkspace(["packages/zebra", "packages/alpha"]);

    expect(
      service
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/alpha", "packages/zebra"]);
  });

  it("descends into a project that nests another tsconfig.json beneath it", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "packages/library/testing",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library", "packages/library/testing"]);
  });

  it("does not descend into node_modules, build output, or dotfiles", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "node_modules/some-dependency",
      "packages/library/dist",
      ".git/hooks",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("does not descend into a scaffolding template's placeholder directory", async () => {
    const root = await buildWorkspace([
      "packages/library",
      "templates/{{nameKebabCase}}",
    ]);

    expect(
      subject
        .discoverProjects({ directories: [], workspaceRoot: root })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("drops a project an exclusion names, before reading its tsconfig", async () => {
    // The regression this exists for: excluding a project only from the file
    // list is too late, because reading its `tsconfig.json` is what fails.
    const root = await buildWorkspace(["packages/library", "packages/broken"]);

    expect(
      subject
        .discoverProjects({
          directories: [],
          fileFilter: {
            isExcluded: (relativePath): boolean =>
              relativePath.startsWith("packages/broken/"),
          },
          workspaceRoot: root,
        })
        .map((project) => project.name),
    ).toStrictEqual(["packages/library"]);
  });

  it("drops a named directory an exclusion also names", async () => {
    const root = await buildWorkspace(["packages/broken"]);

    expect(
      subject.discoverProjects({
        directories: ["packages/broken"],
        fileFilter: { isExcluded: (): boolean => true },
        workspaceRoot: root,
      }),
    ).toStrictEqual([]);
  });

  it("finds nothing in an empty workspace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "callidescope-empty-"));

    expect(
      subject.discoverProjects({ directories: [], workspaceRoot: root }),
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

  // 🎯 Ownership

  it("gives a file to the project whose root contains it", () => {
    expect(
      subject.resolveOwningProject({
        projects: [
          { configurationPath: "", name: "other", root: "packages/other" },
          PROJECT,
        ],
        workspaceRelativePath: "packages/example/src/main.ts",
      }),
    ).toStrictEqual(PROJECT);
  });

  it("gives a file to the nearest containing root, not any ancestor", () => {
    const nested: WorkspaceProject = {
      configurationPath: "",
      name: "example/testing",
      root: "packages/example/testing",
    };

    expect(
      subject.resolveOwningProject({
        projects: [PROJECT, nested],
        workspaceRelativePath: "packages/example/testing/mock.ts",
      }),
    ).toStrictEqual(nested);
    // Order in the list must not matter — the deepest root still wins.
    expect(
      subject.resolveOwningProject({
        projects: [nested, PROJECT],
        workspaceRelativePath: "packages/example/testing/mock.ts",
      }),
    ).toStrictEqual(nested);
  });

  it("does not let a sibling with a shared string prefix claim a file", () => {
    const sibling: WorkspaceProject = {
      configurationPath: "",
      name: "example",
      root: "packages/example",
    };

    expect(
      subject.resolveOwningProject({
        projects: [sibling],
        workspaceRelativePath: "packages/example-extra/src/main.ts",
      }),
    ).toBeUndefined();
  });

  it("falls back to the workspace root project for an otherwise unowned file", () => {
    const root: WorkspaceProject = {
      configurationPath: "",
      name: "",
      root: "",
    };

    expect(
      subject.resolveOwningProject({
        projects: [PROJECT, root],
        workspaceRelativePath: "scripts/build.ts",
      }),
    ).toStrictEqual(root);
  });

  it("names no owner when no traced project contains the file", () => {
    expect(
      subject.resolveOwningProject({
        projects: [PROJECT],
        workspaceRelativePath: "packages/other/src/main.ts",
      }),
    ).toBeUndefined();
  });

  // ⚙️ Configuration

  it("names a module folder by a configured modules directory", () => {
    const configured = new WorkspaceService(subjectLogger);

    configured.configure({
      modulesDirectory: "features",
      rootModuleSegment: "lib",
    });

    expect(
      configured.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath:
          "packages/example/lib/features/discovery/discovery.service.ts",
      }),
    ).toBe("example:features/discovery");
  });

  it("names a file directly under a configured root segment", () => {
    const configured = new WorkspaceService(subjectLogger);

    configured.configure({
      modulesDirectory: "features",
      rootModuleSegment: "lib",
    });

    expect(
      configured.resolveModuleId({
        project: PROJECT,
        workspaceRelativePath: "packages/example/lib/main.ts",
      }),
    ).toBe("example:lib");
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
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped a missing ignore file",
      undefined,
      { ignoreFile: "configuration/.callidescopeignore" },
    );
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
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped an unreadable ignore file",
      undefined,
      {
        ignorePath: path.join(root, "configuration", ".callidescopeignore"),
      },
    );
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
    expect(
      filter.isExcluded("applications/lexico/src/lib/routeTree.gen.ts"),
    ).toBe(true);
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
