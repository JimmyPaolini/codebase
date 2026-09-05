import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import { WorkspaceService } from "../workspace/workspace.service";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramConfigurationError } from "./program.constants";
import { ProgramService } from "./program.service";

import type { WorkspaceProject } from "../workspace/workspace.types";
import type { LoggerService } from "@codebase/logger";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** Writes a project holding one source file, and returns its description. */
async function buildProject(args: {
  configuration?: string;
  name: string;
  sources?: Record<string, string>;
}): Promise<{ project: WorkspaceProject; workspaceRoot: string }> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-program-"),
  );
  const root = path.join(workspaceRoot, "packages", args.name);

  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    args.configuration ??
      JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["src/**/*.ts"],
      }),
    "utf8",
  );

  for (const [name, text] of Object.entries(
    args.sources ?? { "src/index.ts": "export function entry(): void {}\n" },
  )) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text, "utf8");
  }

  return {
    project: {
      configurationPath: path.join(root, "tsconfig.json"),
      name: args.name,
      root: `packages/${args.name}`,
    },
    workspaceRoot,
  };
}

describe(ProgramService, () => {
  let service: ProgramService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ProgramService],
    }).compile();

    service = await module.resolve(ProgramService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  let subjectLogger: DeepMocked<LoggerService>;

  const buildSubject = (): ProgramService => {
    subjectLogger = createMock<LoggerService>();

    return new ProgramService(
      new CompilerHostService(),
      subjectLogger,
      new WorkspaceService(createMock<LoggerService>()),
    );
  };

  it("logs which project it is reading", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    buildSubject().buildPrograms({ projects: [project], workspaceRoot });

    expect(subjectLogger.debug).toHaveBeenCalledWith(
      "🔭 Reading a project",
      undefined,
      { projectName: "example" },
    );
  });

  it("builds a program and a checker for a project", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    const programSet = buildSubject().buildPrograms({
      projects: [project],
      workspaceRoot,
    });

    expect(programSet.programs).toHaveLength(1);
    expect(programSet.programs[0]?.checker).toBeDefined();
  });

  it("records the files a project owns", async () => {
    const { project, workspaceRoot } = await buildProject({
      name: "example",
      sources: {
        "src/a.ts": "export function a(): void {}\n",
        "src/b.ts": "export function b(): void {}\n",
      },
    });

    const programSet = buildSubject().buildPrograms({
      projects: [project],
      workspaceRoot,
    });

    expect(programSet.programs[0]?.ownedFilePaths.size).toBe(2);
  });

  it("assigns every owned file to exactly one program", async () => {
    const { project, workspaceRoot } = await buildProject({ name: "example" });

    const programSet = buildSubject().buildPrograms({
      projects: [project],
      workspaceRoot,
    });

    expect(programSet.ownerByFilePath.size).toBe(1);
  });

  it("gives a file nested inside a second project to that nested project", async () => {
    // A parent project can list the same file its nested project owns when
    // the parent's own `include` is broad enough to reach it too —
    // containment settles that overlap by the file's location on disk,
    // regardless of which program was built first.
    const { project: parent, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["src/**/*.ts", "testing/**/*.ts"],
      }),
      name: "example",
      sources: {
        "src/index.ts": "export function entry(): void {}\n",
        "testing/mock.ts": "export function mock(): void {}\n",
      },
    });
    const nestedRoot = path.join(workspaceRoot, "packages/example/testing");

    await mkdir(nestedRoot, { recursive: true });
    await writeFile(
      path.join(nestedRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["**/*.ts"],
      }),
      "utf8",
    );

    const nested: WorkspaceProject = {
      configurationPath: path.join(nestedRoot, "tsconfig.json"),
      name: "example-testing",
      root: "packages/example/testing",
    };

    const subject = buildSubject();
    const programSet = subject.buildPrograms({
      projects: [parent, nested],
      workspaceRoot,
    });

    const nestedFilePath = subject.toRealPath(path.join(nestedRoot, "mock.ts"));
    const parentFilePath = subject.toRealPath(
      path.join(workspaceRoot, "packages/example/src/index.ts"),
    );

    expect(programSet.ownerByFilePath.get(nestedFilePath)?.project.name).toBe(
      "example-testing",
    );
    expect(programSet.ownerByFilePath.get(parentFilePath)?.project.name).toBe(
      "example",
    );
  });

  it("skips a file no traced project contains, and warns why", async () => {
    // A project's own `include` can reach outside its own root — here into a
    // sibling directory no project in this run traces — so containment finds
    // nowhere to put the file rather than guessing.
    const { project, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { noLib: true, target: "es2022" },
        include: ["../shared/**/*.ts"],
      }),
      name: "example",
      sources: {},
    });

    await mkdir(path.join(workspaceRoot, "packages/shared"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceRoot, "packages/shared/helper.ts"),
      "export function helper(): void {}\n",
      "utf8",
    );

    const subject = buildSubject();
    const programSet = subject.buildPrograms({
      projects: [project],
      workspaceRoot,
    });

    expect(programSet.ownerByFilePath.size).toBe(0);
    expect(subjectLogger.warn).toHaveBeenCalledWith(
      "🔭 Skipped a file no traced project contains",
      undefined,
      { workspaceRelativePath: "packages/shared/helper.ts" },
    );
  });

  it("throws when a tsconfig cannot be read", async () => {
    const { project, workspaceRoot } = await buildProject({
      configuration: "{ not json",
      name: "broken",
    });

    expect(() =>
      buildSubject().buildPrograms({ projects: [project], workspaceRoot }),
    ).toThrow(ProgramConfigurationError);
  });

  it("throws when a tsconfig holds an invalid option", async () => {
    const { project, workspaceRoot } = await buildProject({
      configuration: JSON.stringify({
        compilerOptions: { target: "not-a-target" },
      }),
      name: "invalid",
    });

    expect(() =>
      buildSubject().buildPrograms({ projects: [project], workspaceRoot }),
    ).toThrow(ProgramConfigurationError);
  });

  it("builds no program at all when one project cannot be read", async () => {
    // Deliberately not partial. A caller writes its report before it weighs
    // its findings, so half a graph is a published wrong answer rather than a
    // smaller right one.
    const broken = await buildProject({
      configuration: "{ not json",
      name: "broken",
    });
    const readable = await buildProject({ name: "readable" });

    expect(() =>
      buildSubject().buildPrograms({
        projects: [broken.project, readable.project],
        workspaceRoot: readable.workspaceRoot,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  it("resolves a path that is not a symlink to itself", () => {
    expect(buildSubject().toRealPath("/workspace/a.ts")).toContain("a.ts");
  });

  it("returns the path unchanged when the host offers no realpath", () => {
    const realpath = ts.sys.realpath?.bind(ts.sys);

    delete ts.sys.realpath;

    try {
      expect(buildSubject().toRealPath("/workspace/a.ts")).toBe(
        "/workspace/a.ts",
      );
    } finally {
      if (realpath !== undefined) {
        ts.sys.realpath = realpath;
      }
    }
  });
});
