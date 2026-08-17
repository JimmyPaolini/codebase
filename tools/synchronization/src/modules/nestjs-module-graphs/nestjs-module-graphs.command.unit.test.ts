import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";
import { NestjsModuleGraphsMarkersService } from "./nestjs-module-graphs-markers.service";
import { NestjsModuleGraphsCommand } from "./nestjs-module-graphs.command";
import {
  NESTJS_MODULE_GRAPH_MARKER,
  NESTJS_MODULE_GRAPH_TARGET_FILES,
} from "./nestjs-module-graphs.constants";
import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

import type {
  NestjsModuleGraph,
  NestjsProject,
} from "./nestjs-module-graphs.types";

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
  "  MainModule --> A",
  "```",
].join("\n");

const graph: NestjsModuleGraph = {
  ambientModuleNames: [],
  edges: [{ from: "MainModule", to: "A" }],
  isolatedModuleNames: [],
  moduleNames: ["A", "MainModule"],
};

const project: NestjsProject = {
  absoluteRoot: path.join(process.cwd(), "applications/example"),
  name: "example",
  rootModuleFile: path.join(
    process.cwd(),
    "applications/example/src/main.module.ts",
  ),
};

const targetFiles = NESTJS_MODULE_GRAPH_TARGET_FILES.map((fileName) =>
  path.join(project.absoluteRoot, fileName),
);

/** Renders a markdown file whose marker block holds the given content. */
function buildMarkdown(blockContent: string): string {
  return [
    "# Example",
    "",
    `<!-- ${NESTJS_MODULE_GRAPH_MARKER}-start -->`,
    "",
    blockContent,
    "",
    `<!-- ${NESTJS_MODULE_GRAPH_MARKER}-end -->`,
    "",
  ].join("\n");
}

describe(NestjsModuleGraphsCommand, () => {
  let command: NestjsModuleGraphsCommand;
  let logger: LoggerService;
  let graphService: NestjsModuleGraphsGraphService;
  let moduleGraphsService: NestjsModuleGraphsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsModuleGraphsCommand,
        NestjsModuleGraphsMarkersService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NestjsModuleGraphsGraphService,
          useValue: createMock<NestjsModuleGraphsGraphService>(),
        },
        {
          provide: NestjsModuleGraphsService,
          useValue: createMock<NestjsModuleGraphsService>(),
        },
      ],
    }).compile();

    command = await module.resolve(NestjsModuleGraphsCommand);
    logger = await module.resolve(LoggerService);
    graphService = await module.resolve(NestjsModuleGraphsGraphService);
    moduleGraphsService = await module.resolve(NestjsModuleGraphsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fileContents.clear();

    vi.mocked(moduleGraphsService.discoverProjects).mockReturnValue([project]);
    vi.mocked(moduleGraphsService.exploreProject).mockResolvedValue(graph);
    vi.mocked(graphService.renderMermaid).mockReturnValue(diagram);

    for (const targetFile of targetFiles) {
      fileContents.set(targetFile, buildMarkdown(diagram));
    }
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsModuleGraphsCommand,
        NestjsModuleGraphsMarkersService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NestjsModuleGraphsGraphService,
          useValue: createMock<NestjsModuleGraphsGraphService>(),
        },
        {
          provide: NestjsModuleGraphsService,
          useValue: createMock<NestjsModuleGraphsService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("NestjsModuleGraphsCommand");
  });

  it("reports success when every graph is already current", async () => {
    await expect(command.synchronize("check")).resolves.toBe(true);

    expect(logger.log).toHaveBeenCalledWith(
      "🕸️ Verified every NestJS module graph",
      undefined,
      { projects: 1 },
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("reports drift in check mode without writing", async () => {
    fileContents.set(targetFiles[0] ?? "", buildMarkdown("stale diagram"));

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      "🕸️ Detected out-of-sync NestJS module graphs",
      undefined,
      expect.objectContaining({ files: [path.join("example", "AGENTS.md")] }),
    );
  });

  it("rewrites a stale graph in write mode", async () => {
    const staleFile = targetFiles[0] ?? "";
    fileContents.set(staleFile, buildMarkdown("stale diagram"));

    await expect(command.synchronize("write")).resolves.toBe(true);

    expect(fileContents.get(staleFile)).toContain(diagram);
    expect(fileContents.get(staleFile)).not.toContain("stale diagram");
    expect(writeFileSync).toHaveBeenCalledTimes(1);
  });

  // A file with no markers names a project whose graph has nowhere to live,
  // which write mode cannot fix on its own.
  it("reports a target file without markers as drift in both modes", async () => {
    fileContents.set(targetFiles[0] ?? "", "# Example\n");

    await expect(command.synchronize("write")).resolves.toBe(false);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Missing <!-- nestjs-module-graph-start -->"),
    );
  });

  // Which documents a project must keep is conformetry's rule, enforced from
  // the templates the markers now live in.
  it("skips a target file the project does not have", async () => {
    fileContents.delete(targetFiles[0] ?? "");

    await expect(command.synchronize("check")).resolves.toBe(true);

    expect(logger.log).not.toHaveBeenCalledWith(
      expect.stringContaining("Missing"),
    );
  });

  it("reports failure when a project cannot be explored", async () => {
    vi.mocked(moduleGraphsService.exploreProject).mockRejectedValue(
      new Error("boom"),
    );

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing NestJS module graphs",
      expect.stringContaining("boom"),
    );
  });

  it("reports a non-Error failure", async () => {
    const failure: unknown = "unusable";
    vi.mocked(moduleGraphsService.discoverProjects).mockImplementation(() => {
      throw failure;
    });

    await expect(command.synchronize("check")).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing NestJS module graphs",
      "unusable",
    );
  });

  it("defaults to check mode when no mode is passed", async () => {
    fileContents.set(targetFiles[0] ?? "", buildMarkdown("stale diagram"));

    await expectProcessExitOne(async () => {
      await command.run([]);
    });

    expect(fileContents.get(targetFiles[0] ?? "")).toContain("stale diagram");
  });

  it("exits with code 1 when a graph is out of sync", async () => {
    fileContents.set(targetFiles[0] ?? "", buildMarkdown("stale diagram"));

    await expectProcessExitOne(async () => {
      await command.run(["check"]);
    });

    expect(logger.log).toHaveBeenCalledWith(
      "🕸️ Detected out-of-sync NestJS module graphs",
      undefined,
      expect.any(Object),
    );
  });

  it("exits with code 1 on an unknown mode", async () => {
    await expectProcessExitOne(async () => {
      await command.run(["sideways"]);
    });

    expect(moduleGraphsService.discoverProjects).not.toHaveBeenCalled();
  });
});
