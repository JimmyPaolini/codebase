import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProjectsService } from "../projects/projects.service";

import { DirectoriesCommand } from "./directories.command";

import type { ProjectGraph } from "@nx/devkit";

/** An empty graph, since every resolution these tests run is mocked. */
const EMPTY_GRAPH: ProjectGraph = { dependencies: {}, nodes: {} };

describe(DirectoriesCommand, () => {
  let command: DirectoriesCommand;
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let projectsService: ReturnType<typeof createMock<ProjectsService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DirectoriesCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ProjectsService, useValue: createMock<ProjectsService>() },
      ],
    }).compile();

    command = await module.resolve(DirectoriesCommand);
  });

  beforeEach(() => {
    logger = createMock<LoggerService>();
    projectsService = createMock<ProjectsService>();
    projectsService.readProjectGraph.mockResolvedValue(EMPTY_GRAPH);

    command = new DirectoriesCommand(projectsService, logger);

    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        DirectoriesCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ProjectsService, useValue: createMock<ProjectsService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DirectoriesCommand");
  });

  // 🎛️ Option parsing

  describe("parseProjects", () => {
    it("splits a comma-separated list of names", () => {
      expect.hasAssertions();
      expect(command.parseProjects("alpha,beta")).toStrictEqual([
        "alpha",
        "beta",
      ]);
    });

    it("trims the names and drops the empty ones", () => {
      expect.hasAssertions();
      expect(command.parseProjects(" alpha , ,beta, ")).toStrictEqual([
        "alpha",
        "beta",
      ]);
    });

    it("reads a flag passed without a value as no names at all", () => {
      expect.hasAssertions();
      expect(command.parseProjects(undefined)).toStrictEqual([]);
    });
  });

  // 🏃 Running

  it("prints the resolved directories on one separator-joined line", async () => {
    expect.hasAssertions();

    projectsService.resolveDirectories.mockReturnValue({
      directories: ["packages/callidescope-cli", "tools/validation"],
      knownNames: ["callidescope-cli", "validation"],
      unknownNames: [],
    });

    await command.run([], { projects: ["callidescope-cli", "validation"] });

    expect(projectsService.resolveDirectories).toHaveBeenCalledWith({
      graph: EMPTY_GRAPH,
      projectNames: ["callidescope-cli", "validation"],
    });
    expect(process.stdout.write).toHaveBeenCalledWith(
      "packages/callidescope-cli,tools/validation\n",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("rejects a run whose --projects carried no value", async () => {
    expect.hasAssertions();

    await command.run([], { projects: true });

    expect(process.exitCode).toBe(1);
    expect(projectsService.readProjectGraph).not.toHaveBeenCalled();
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it("rejects a run that named no projects", async () => {
    expect.hasAssertions();

    await command.run([], {});

    expect(process.exitCode).toBe(1);
    expect(projectsService.readProjectGraph).not.toHaveBeenCalled();
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it("rejects a run that named a project the workspace does not have", async () => {
    expect.hasAssertions();

    projectsService.resolveDirectories.mockReturnValue({
      directories: ["packages/callidescope-cli"],
      knownNames: ["callidescope-cli"],
      unknownNames: ["callidescope-nix"],
    });

    await command.run([], {
      projects: ["callidescope-cli", "callidescope-nix"],
    });

    expect(process.exitCode).toBe(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      expect.objectContaining({
        knownNames: ["callidescope-cli"],
        unknownNames: ["callidescope-nix"],
      }),
    );
    // The known names come off the resolution rather than a second walk of
    // the graph the command would have to know how to read.
    expect(projectsService.readProjects).not.toHaveBeenCalled();
  });
});
