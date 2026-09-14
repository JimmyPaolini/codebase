import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MainModule } from "../../main.module";

import { MapCommand } from "./map.command";

import type { MapCommandOptions } from "./map.types";

/**
 * A fixture Nx project graph, standing in for `nx graph --file=graph.json` —
 * see `NeighborhoodService.readProjectGraph`. This is what lets the fixture
 * tree below run with no real Nx workspace under it: `codependix.config.ts`'s
 * `projectGraph` field points straight at this file.
 */
const PROJECT_GRAPH = {
  dependencies: {},
  nodes: {
    "project-with-defaults-only": {
      data: { root: "packages/project-with-defaults-only" },
      name: "project-with-defaults-only",
      type: "lib",
    },
    "project-with-own-file": {
      data: { root: "packages/project-with-own-file" },
      name: "project-with-own-file",
      type: "lib",
    },
    "project-without-a-file": {
      data: { root: "packages/project-without-a-file" },
      name: "project-without-a-file",
      type: "lib",
    },
  },
};

describe("map command over a fixture tree", () => {
  let workingDirectory: string;
  let originalWorkingDirectory: string;

  /** Runs the map command with the process rooted at the fixture tree. */
  async function run(
    options: MapCommandOptions,
  ): Promise<{ exitCode: number }> {
    process.chdir(workingDirectory);
    process.exitCode = 0;

    const module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
    const command = module.get(MapCommand, { strict: false });

    await command.run([], options);

    const exitCode = process.exitCode;

    process.exitCode = 0;
    process.chdir(originalWorkingDirectory);

    return {
      exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
    };
  }

  beforeAll(() => {
    originalWorkingDirectory = process.cwd();
    workingDirectory = mkdtempSync(path.join(tmpdir(), "codependix-map-"));

    mkdirSync(path.join(workingDirectory, "packages/project-with-own-file"), {
      recursive: true,
    });
    mkdirSync(
      path.join(workingDirectory, "packages/project-with-defaults-only"),
      { recursive: true },
    );
    mkdirSync(path.join(workingDirectory, "packages/project-without-a-file"), {
      recursive: true,
    });

    writeFileSync(
      path.join(workingDirectory, "codependix-graph.json"),
      JSON.stringify(PROJECT_GRAPH),
    );

    // The workspace root's own configuration: scopes `include` to every
    // fixture project, points at the fixture project graph above, and
    // exports `projectDefaults` — the object a project's own file spreads,
    // mirroring `configuration/codependix.config.ts`'s real shape.
    writeFileSync(
      path.join(workingDirectory, "codependix.config.ts"),
      [
        "export const projectDefaults = {",
        '  nxProjects: { json: { path: "nx-neighborhood.json" }, target: "json" },',
        "};",
        "",
        "export default {",
        '  include: ["packages/*"],',
        '  projectGraph: "codependix-graph.json",',
        "  workspace: {",
        '    nxProjects: { json: { path: "workspace-graph.json" }, target: "json" },',
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    // Spreads `projectDefaults` and overrides `nxProjects` outright with its
    // own destination — the "project with its own file" case.
    writeFileSync(
      path.join(
        workingDirectory,
        "packages/project-with-own-file/codependix.config.ts",
      ),
      [
        'import { projectDefaults } from "../../codependix.config.js";',
        "",
        "export default {",
        "  ...projectDefaults,",
        '  nxProjects: { json: { path: "own-neighborhood.json" }, target: "json" },',
        "};",
        "",
      ].join("\n"),
    );

    // Spreads `projectDefaults` and overrides nothing — the "root defaults
    // spreading correctly into a project file" case: this project's resolved
    // output is exactly what the root config's `projectDefaults` says.
    writeFileSync(
      path.join(
        workingDirectory,
        "packages/project-with-defaults-only/codependix.config.ts",
      ),
      [
        'import { projectDefaults } from "../../codependix.config.js";',
        "",
        "export default {",
        "  ...projectDefaults,",
        "};",
        "",
      ].join("\n"),
    );

    // `packages/project-without-a-file/` deliberately carries no
    // `codependix.config.ts` of its own — the "project with no file" case.
  });

  afterAll(() => {
    rmSync(workingDirectory, { force: true, recursive: true });
  });

  it("writes a project's own file's export, spreading and then overriding projectDefaults", async () => {
    const { exitCode } = await run({
      directory: workingDirectory,
      write: true,
    });

    expect(exitCode).toBe(0);

    const ownGraphPath = path.join(
      workingDirectory,
      "packages/project-with-own-file/own-neighborhood.json",
    );

    expect(existsSync(ownGraphPath)).toBe(true);
    expect(
      JSON.parse(readFileSync(ownGraphPath, "utf8")) as { projectName: string },
    ).toMatchObject({ projectName: "project-with-own-file" });
  });

  it("writes projectDefaults' own destination for a project that spreads it unchanged", () => {
    const spreadOnlyGraphPath = path.join(
      workingDirectory,
      "packages/project-with-defaults-only/nx-neighborhood.json",
    );

    expect(existsSync(spreadOnlyGraphPath)).toBe(true);
    expect(
      JSON.parse(readFileSync(spreadOnlyGraphPath, "utf8")) as {
        projectName: string;
      },
    ).toMatchObject({ projectName: "project-with-defaults-only" });
  });

  it("writes nothing at all for an included project with no configuration file of its own", () => {
    const projectRoot = path.join(
      workingDirectory,
      "packages/project-without-a-file",
    );

    expect(existsSync(path.join(projectRoot, "nx-neighborhood.json"))).toBe(
      false,
    );
    expect(existsSync(path.join(projectRoot, "own-neighborhood.json"))).toBe(
      false,
    );
  });

  it("still lists a file-less project in the Workspace Graph", () => {
    const workspaceGraphPath = path.join(
      workingDirectory,
      "workspace-graph.json",
    );
    const workspaceGraph = JSON.parse(
      readFileSync(workspaceGraphPath, "utf8"),
    ) as { projectNames: string[] };

    expect(workspaceGraph.projectNames).toContain("project-without-a-file");
  });

  it("passes --check reports right after --write", async () => {
    const { exitCode } = await run({
      check: "reports",
      directory: workingDirectory,
    });

    expect(exitCode).toBe(0);
  });

  it("fails --check reports once a project's own written export drifts", async () => {
    const ownGraphPath = path.join(
      workingDirectory,
      "packages/project-with-own-file/own-neighborhood.json",
    );

    writeFileSync(ownGraphPath, JSON.stringify({ drifted: true }));

    const { exitCode } = await run({
      check: "reports",
      directory: workingDirectory,
    });

    expect(exitCode).toBe(1);

    // Restore what --write produced, so later tests in this file are not
    // affected by this test's drift.
    await run({ directory: workingDirectory, write: true });
  });
});
