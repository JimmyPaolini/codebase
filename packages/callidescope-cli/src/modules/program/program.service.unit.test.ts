import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramConfigurationError } from "./program.errors";
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

  await mkdir(path.join(root, "src"), { recursive: true });
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

    return new ProgramService(new CompilerHostService(), subjectLogger);
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

  it("gives a shared file to the first project that claims it", async () => {
    // The claim order comes from the sorted project list, which is what stops
    // a reported depth from moving between runs.
    const { project, workspaceRoot } = await buildProject({ name: "example" });
    const second: WorkspaceProject = { ...project, name: "duplicate" };

    const programSet = buildSubject().buildPrograms({
      projects: [project, second],
      workspaceRoot,
    });

    expect([...programSet.ownerByFilePath.values()][0]?.project.name).toBe(
      "example",
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
