import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  GraphAssemblyService,
  ProgramConfigurationError,
} from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ANALYSIS_MODULES } from "../../../testing/modules";

import { CallidescopeService } from "./callidescope.service";

import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * Adds a second project whose `tsconfig.json` names a compiler target
 * TypeScript rejects.
 *
 * The shape of the one already committed in `codependix-examples`: a fixture
 * that exists to be unreadable and must stay that way, sitting in the same
 * workspace as every project a run is meant to trace.
 */
async function addUnreadableProject(workspaceRoot: string): Promise<void> {
  const root = path.join(workspaceRoot, "packages", "broken");

  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { target: "not-a-real-target" },
      include: ["src/**/*.ts"],
    }),
    "utf8",
  );
  await writeFile(
    path.join(root, "src", "index.ts"),
    "export function broken(): void {}\n",
    "utf8",
  );
}

/** Builds a resolved configuration for the fixture workspace. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    directories: [],
    entryPoints: {
      decorators: ["Command"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeFrom: [],
    ignoreCallees: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 2,
      maximumDepth: 2,
      maximumImplementationCandidates: 8,
      minimumCallers: 2,
      spreadThreshold: 2,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
      projectReadmes: undefined,
    },
    workspaceStructure: {
      modulesDirectory: "modules",
      rootModuleSegment: "src",
    },
  };
}

/**
 * Writes four projects: one that calls into a second, one that calls into the
 * first, and one nothing touches.
 *
 * The shape a scoped run has to get right in three directions at once — down
 * into a dependency, not up into a dependent, and not sideways into a package
 * neither of them mentions.
 */
async function buildLayeredWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-closure-"),
  );

  await writeProject({
    name: "library",
    sources: {
      "src/index.ts": `
        export class Repository {
          public find(): void { this.open(); }
          public open(): void {}
        }
      `,
    },
    workspaceRoot,
  });
  await writeProject({
    name: "application",
    sources: {
      "src/main.ts": `
        import { Repository } from "../../library/src/index";

        function Command(): ClassDecorator { return () => undefined; }

        @Command()
        export class ApplicationCommand {
          constructor(private readonly repository: Repository) {}
          public run(): void { this.repository.find(); }
        }
      `,
    },
    workspaceRoot,
  });
  await writeProject({
    name: "consumer",
    sources: {
      "src/index.ts": `
        import { ApplicationCommand } from "../../application/src/main";

        export function bootstrap(command: ApplicationCommand): void {
          command.run();
        }
      `,
    },
    workspaceRoot,
  });
  await writeProject({
    name: "unrelated",
    sources: { "src/index.ts": "export function unrelated(): void {}\n" },
    workspaceRoot,
  });

  return workspaceRoot;
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

/** Reads the deepest depth a project's report measured for one type. */
function readTypeDepth(args: {
  projectName: string;
  result: CallGraphResult;
  typeName: string;
}): number | undefined {
  return args.result.projects
    .find((report) => report.projectName === args.projectName)
    ?.typeDepths.find((entry) => entry.typeName === args.typeName)
    ?.maximumDepth;
}

/** Writes one project into a workspace, with the fixture compiler options. */
async function writeProject(args: {
  name: string;
  sources: Record<string, string>;
  workspaceRoot: string;
}): Promise<void> {
  const root = path.join(args.workspaceRoot, "packages", args.name);

  await mkdir(root, { recursive: true });
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

  for (const [name, text] of Object.entries(args.sources)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), text, "utf8");
  }
}

describe(`${CallidescopeService.name} (integration)`, () => {
  let result: CallGraphResult;
  let frames: string[];
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let service: CallidescopeService;
  let tracedWorkspaceRoot: string;

  beforeAll(async () => {
    const workspaceRoot = await buildWorkspace();

    tracedWorkspaceRoot = workspaceRoot;
    logger = createMock<LoggerService>();

    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [
        CallidescopeService,
        GraphAssemblyService,
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = await module.resolve(CallidescopeService);

    const outcome = service.trace({
      configuration: buildConfiguration(),
      directories: [],
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

  it("logs the workspace it traces", () => {
    // The global test setup clears mocks before every `it`, so the trace
    // recorded in `beforeAll` is invisible here — this exercises the same
    // resolved service again to see its own logger calls.
    service.trace({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Tracing a workspace",
      undefined,
      {
        workspaceRoot: tracedWorkspaceRoot,
      },
    );
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

  // 🔍 Locating callables

  it("collects the same callables locate would need to resolve an address", () => {
    const located = service.locate({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    const displayNames = [...located.callablesById.values()].map(
      (callable) => callable.node.displayName,
    );

    expect(displayNames).toStrictEqual([
      "Repository.find",
      "Repository.open",
      "ExampleService.constructor",
      "ExampleService.load",
      "Command",
      "anonymous",
      "ExampleCommand.constructor",
      "ExampleCommand.run",
    ]);

    const projectRoot = path.join("packages", "example");

    expect(located.projectRoots.get(projectRoot)).toBe(projectRoot);
  });

  // 🚧 A project that cannot be read

  it("refuses to trace a workspace holding a project it cannot read", async () => {
    // Fail fast, and fail whole. A partial graph would be published by the
    // caller before it weighed a single finding, so the wrong depths would be
    // committed and only then reported as a failure.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    expect(() =>
      service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot,
      }),
    ).toThrow(ProgramConfigurationError);
  });

  it("names the configuration it could not read", async () => {
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    expect(() =>
      service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot,
      }),
    ).toThrow(/packages[\\/]broken[\\/]tsconfig\.json/);
  });

  it("traces the rest of a workspace whose broken project is excluded", async () => {
    // The regression this exists for. Excluding the same project only from
    // the collected files came too late — opening its configuration is the
    // step that fails — so `.callidescopeignore` could not keep a run away
    // from a fixture written to be broken, and the whole trace died on it.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    const outcome = service.trace({
      configuration: {
        ...buildConfiguration(),
        exclude: ["packages/broken/**"],
      },
      directories: [],
      workspaceRoot,
    });

    expect(outcome.result.summary.projectCount).toBe(1);
    expect(
      outcome.result.deepStacks[0]?.frames.map((frame) => frame.displayName),
    ).toStrictEqual([
      "ExampleCommand.run",
      "ExampleService.load",
      "Repository.find",
      "Repository.open",
    ]);
  });

  it("never opens a tsconfig an exclusion already names", async () => {
    // What `.callidescopeignore` promises. Excluding the same project only
    // from the collected files would come too late — opening its
    // configuration is the step that fails.
    const workspaceRoot = await buildWorkspace();

    await addUnreadableProject(workspaceRoot);

    const outcome = service.trace({
      configuration: {
        ...buildConfiguration(),
        exclude: ["packages/broken/**"],
      },
      directories: [],
      workspaceRoot,
    });

    expect(outcome.projectNames).toStrictEqual([
      path.join("packages", "example"),
    ]);
  });

  // 🕸️ A run scoped to one project

  describe("scoped to one project", () => {
    let layeredWorkspaceRoot: string;
    let scoped: ReturnType<CallidescopeService["trace"]>;
    let unscoped: ReturnType<CallidescopeService["trace"]>;

    beforeAll(async () => {
      layeredWorkspaceRoot = await buildLayeredWorkspace();
      scoped = service.trace({
        configuration: buildConfiguration(),
        directories: [path.join("packages", "application")],
        workspaceRoot: layeredWorkspaceRoot,
      });
      unscoped = service.trace({
        configuration: buildConfiguration(),
        directories: [],
        workspaceRoot: layeredWorkspaceRoot,
      });
    });

    it("reports the project it was given and the one its imports reach", () => {
      expect(scoped.projectNames).toStrictEqual([
        path.join("packages", "application"),
        path.join("packages", "library"),
      ]);
    });

    it("follows a call into a dependency down to a real frame", () => {
      // Without the dependency's own program there is no declaration to
      // resolve `find` against, so the stack stopped at the package boundary
      // and the two frames below it were never measured.
      expect(
        scoped.result.deepStacks[0]?.frames.map((frame) => frame.displayName),
      ).toStrictEqual([
        "ApplicationCommand.run",
        "Repository.find",
        "Repository.open",
      ]);
    });

    it("reports an exact depth rather than a lower bound", () => {
      expect(scoped.result.deepStacks[0]?.isLowerBound).toBe(false);
    });

    it("leaves a project that imports the scoped one out of the report", () => {
      expect(
        scoped.result.projects.map((report) => report.projectName),
      ).not.toContain(path.join("packages", "consumer"));
    });

    it("leaves a project nothing reaches out of the report", () => {
      expect(
        scoped.result.projects.map((report) => report.projectName),
      ).not.toContain(path.join("packages", "unrelated"));
    });

    it("measures the same depth as the run that traced everything", () => {
      const arguments_ = {
        projectName: path.join("packages", "application"),
        typeName: "ApplicationCommand",
      };

      expect(readTypeDepth({ ...arguments_, result: scoped.result })).toBe(
        readTypeDepth({ ...arguments_, result: unscoped.result }),
      );
    });

    it("still means every project when no directory is named", () => {
      expect(unscoped.projectNames).toStrictEqual([
        path.join("packages", "application"),
        path.join("packages", "consumer"),
        path.join("packages", "library"),
        path.join("packages", "unrelated"),
      ]);
    });

    it("refuses a named directory holding no tsconfig.json", () => {
      // Reported through the same channel as a project it could not read,
      // rather than warned past — a run that quietly traced one project fewer
      // than it was told to is a gate that passed for having looked at less.
      expect(() =>
        service.trace({
          configuration: buildConfiguration(),
          directories: [path.join("packages", "missing")],
          workspaceRoot: layeredWorkspaceRoot,
        }),
      ).toThrow(ProgramConfigurationError);
    });
  });

  it("builds the same graph a full trace would, without any analysis", () => {
    const located = service.locate({
      configuration: buildConfiguration(),
      directories: [],
      workspaceRoot: tracedWorkspaceRoot,
    });

    const commandId = [...located.callablesById.entries()].find(
      ([, callable]) => callable.node.displayName === "ExampleCommand.run",
    )?.[0];
    const serviceId = [...located.callablesById.entries()].find(
      ([, callable]) => callable.node.displayName === "ExampleService.load",
    )?.[0];

    expect(
      commandId !== undefined && located.graph.calleeIdsByCaller.get(commandId),
    ).toStrictEqual([serviceId]);
  });
});
