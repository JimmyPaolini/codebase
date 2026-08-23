import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationMarkersService } from "../synchronization/synchronization-markers.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { NxProjectGraphsCommand } from "./nx-project-graphs.command";
import {
  NX_PROJECT_GRAPH_MARKER,
  NX_PROJECT_GRAPH_TARGET_FILE,
} from "./nx-project-graphs.constants";
import { NxProjectGraphsService } from "./nx-project-graphs.service";

import type {
  NxProject,
  NxProjectGraphNeighborhood,
} from "./nx-project-graphs.types";
import type { ProjectGraph } from "@nx/devkit";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(filePath: string) => boolean>((filePath: string) =>
    fileContents.has(filePath),
  ),
  readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
    const value = fileContents.get(filePath);
    if (value === undefined) throw new Error(`File not found: ${filePath}`);
    return value;
  }),
  writeFileSync: vi.fn<(filePath: string, content: string) => void>(
    (filePath: string, content: string) => {
      fileContents.set(filePath, content);
    },
  ),
}));

const diagram = [
  "```mermaid",
  "flowchart LR",
  '  logger["logger"]',
  "```",
].join("\n");

const project: NxProject = {
  absoluteRoot: path.join(process.cwd(), "packages/logger"),
  name: "logger",
};

const targetFile = path.join(
  project.absoluteRoot,
  NX_PROJECT_GRAPH_TARGET_FILE,
);

const neighborhood: NxProjectGraphNeighborhood = {
  dependencies: [],
  dependents: ["caelundas"],
  edges: [{ implicit: false, source: "caelundas", target: "logger" }],
  projectName: "logger",
};

/** Renders a markdown file whose marker block holds the given content. */
function buildMarkdown(blockContent: string): string {
  return [
    "# Logger",
    "",
    `<!-- ${NX_PROJECT_GRAPH_MARKER}-start -->`,
    "",
    blockContent,
    "",
    `<!-- ${NX_PROJECT_GRAPH_MARKER}-end -->`,
    "",
  ].join("\n");
}

describe(NxProjectGraphsCommand, () => {
  let command: NxProjectGraphsCommand;
  let logger: LoggerService;
  let projectGraphsService: NxProjectGraphsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NxProjectGraphsCommand,
        SynchronizationMarkersService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NxProjectGraphsService,
          useValue: createMock<NxProjectGraphsService>(),
        },
      ],
    }).compile();

    command = await module.resolve(NxProjectGraphsCommand);
    logger = await module.resolve(LoggerService);
    projectGraphsService = await module.resolve(NxProjectGraphsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fileContents.clear();

    vi.mocked(projectGraphsService.readProjectGraph).mockResolvedValue(
      createMock<ProjectGraph>(),
    );
    vi.mocked(projectGraphsService.readProjects).mockReturnValue([project]);
    vi.mocked(projectGraphsService.buildNeighborhoods).mockReturnValue(
      new Map([[project.name, neighborhood]]),
    );
    vi.mocked(projectGraphsService.renderMermaid).mockReturnValue(diagram);

    fileContents.set(targetFile, buildMarkdown(diagram));
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NxProjectGraphsCommand,
        SynchronizationMarkersService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NxProjectGraphsService,
          useValue: createMock<NxProjectGraphsService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("NxProjectGraphsCommand");
  });

  it("reports success when every graph is already current", async () => {
    await expect(command.synchronize("check")).resolves.toBe(true);

    expect(logger.info).toHaveBeenCalledWith(
      "🧭 Verified every Nx project graph",
      undefined,
      { projects: 1 },
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("logs before reading the Nx project graph", async () => {
    await command.synchronize("check");

    expect(logger.debug).toHaveBeenCalledWith(
      "🔍 Reading the Nx project graph",
    );
  });

  it("reports drift in check mode without writing", async () => {
    fileContents.set(targetFile, buildMarkdown("stale diagram"));

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "🧭 Detected out-of-sync Nx project graphs",
      undefined,
      expect.objectContaining({
        files: [path.join("logger", NX_PROJECT_GRAPH_TARGET_FILE)],
      }),
    );
  });

  it("rewrites a stale graph in write mode", async () => {
    fileContents.set(targetFile, buildMarkdown("stale diagram"));

    await expect(command.synchronize("write")).resolves.toBe(true);

    expect(fileContents.get(targetFile)).toContain(diagram);
    expect(fileContents.get(targetFile)).not.toContain("stale diagram");
  });

  it("reports a README without markers as drift", async () => {
    fileContents.set(targetFile, "# Logger\n");

    await expect(command.synchronize("write")).resolves.toBe(false);

    expect(logger.info).toHaveBeenCalledWith("🧭 Missing markers", undefined, {
      marker: `<!-- ${NX_PROJECT_GRAPH_MARKER}-start -->`,
      path: path.join("packages", "logger", NX_PROJECT_GRAPH_TARGET_FILE),
    });
  });

  it("skips a project with no README", async () => {
    fileContents.clear();

    await expect(command.synchronize("check")).resolves.toBe(true);
  });

  it("skips a project the graph has no neighborhood for", async () => {
    vi.mocked(projectGraphsService.buildNeighborhoods).mockReturnValue(
      new Map(),
    );

    await expect(command.synchronize("check")).resolves.toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("reports failure and continues when a project's graph fails to render", async () => {
    vi.mocked(projectGraphsService.renderMermaid).mockImplementation(() => {
      throw new Error("boom");
    });

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing a project's graph",
      undefined,
      { project: "logger", reason: "boom" },
    );
  });

  it("reports a non-Error project graph failure", async () => {
    const failure: unknown = "unusable";
    vi.mocked(projectGraphsService.renderMermaid).mockImplementation(() => {
      throw failure;
    });

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing a project's graph",
      undefined,
      { project: "logger", reason: "unusable" },
    );
  });

  it("reports failure when the project graph cannot be read", async () => {
    vi.mocked(projectGraphsService.readProjectGraph).mockRejectedValue(
      new Error("boom"),
    );

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing Nx project graphs",
      expect.stringContaining("boom"),
    );
  });

  it("reports a non-Error failure", async () => {
    const failure: unknown = "unusable";
    vi.mocked(projectGraphsService.readProjects).mockImplementation(() => {
      throw failure;
    });

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing Nx project graphs",
      "unusable",
    );
  });

  it("defaults to check mode when no mode is passed", async () => {
    fileContents.set(targetFile, buildMarkdown("stale diagram"));

    await expectProcessExitOne(async () => {
      await command.run([]);
    });

    expect(fileContents.get(targetFile)).toContain("stale diagram");
  });

  it("exits with code 1 on an unknown mode", async () => {
    await expectProcessExitOne(async () => {
      await command.run(["sideways"]);
    });

    expect(projectGraphsService.readProjectGraph).not.toHaveBeenCalled();
  });
});
