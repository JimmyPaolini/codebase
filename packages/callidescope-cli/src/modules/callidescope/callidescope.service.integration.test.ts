import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { CallidescopeService } from "./callidescope.service";

import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** Builds a resolved configuration for the fixture workspace. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    entryPoints: {
      decorators: ["Command"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeFrom: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 2,
      maximumDepth: 2,
      maximumImplementationFanOut: 8,
      minimumCallers: 2,
      spreadThreshold: 2,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      projectReadmes: undefined,
    },
    projects: [],
  };
}

/**
 * Writes a workspace to disk holding a command that reaches a repository
 * through an injected service — the shape this tool exists to follow.
 */
async function buildWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-trace-"),
  );
  const root = path.join(workspaceRoot, "packages", "example");

  await mkdir(path.join(root, "src", "modules", "example"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "project.json"),
    JSON.stringify({ name: "example" }),
    "utf8",
  );
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
        noLib: true,
        target: "es2022",
      },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "modules", "example", "example.service.ts"),
    `
      export class Repository {
        public find(): void { this.open(); }
        public open(): void {}
      }

      export class ExampleService {
        constructor(private readonly repository: Repository) {}
        public load(): void { this.repository.find(); }
      }
    `,
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "modules", "example", "example.command.ts"),
    `
      import { ExampleService } from "./example.service";

      function Command(): ClassDecorator { return () => undefined; }

      @Command()
      export class ExampleCommand {
        constructor(private readonly service: ExampleService) {}
        public run(): void { this.service.load(); }
      }
    `,
    "utf8",
  );

  return workspaceRoot;
}

describe(`${CallidescopeService.name} (integration)`, () => {
  let result: CallGraphResult;
  let frames: string[];

  beforeAll(async () => {
    const workspaceRoot = await buildWorkspace();
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CallidescopeService],
    }).compile();
    const service = await module.resolve(CallidescopeService);
    const outcome = service.trace({
      configuration: buildConfiguration(),
      projectNames: [],
      workspaceRoot,
    });

    result = outcome.result;
    frames =
      result.deepStacks[0]?.frames.map((frame) => frame.displayName) ?? [];
  });

  it("discovers the project from its tsconfig on disk", () => {
    expect(result.summary.projectCount).toBe(1);
    expect(result.summary.fileCount).toBe(2);
  });

  it("traces a stack from the command down to the repository", () => {
    // The whole point of the tool: every hop below the command goes through a
    // constructor-injected dependency, and none of it is reachable by reading
    // one file at a time.
    expect(frames).toStrictEqual([
      "ExampleCommand.run",
      "ExampleService.load",
      "Repository.find",
      "Repository.open",
    ]);
  });

  it("roots the stack at the decorated command", () => {
    expect(result.deepStacks[0]?.entryPointKind).toBe("decorated-method");
  });

  it("measures the depth of the traced stack", () => {
    expect(result.deepStacks[0]?.depth).toBe(4);
  });

  it("reports an exact depth when it followed every call", () => {
    expect(result.deepStacks[0]?.isLowerBound).toBe(false);
  });

  it("finds no recursion in a workspace that has none", () => {
    expect(result.summary.cyclicComponentCount).toBe(0);
  });
});
