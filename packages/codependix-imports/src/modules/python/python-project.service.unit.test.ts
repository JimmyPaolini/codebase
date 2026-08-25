// cspell:ignore cpython -- CPython's real __pycache__ bytecode-cache naming scheme
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PythonProjectService } from "./python-project.service";

import type { ProjectGraph } from "@nx/devkit";

/** Builds a project graph node with the given tags. */
function buildGraph(tagsByProject: Record<string, string[]>): ProjectGraph {
  return {
    dependencies: {},
    nodes: Object.fromEntries(
      Object.entries(tagsByProject).map(([name, tags]) => [
        name,
        { data: { root: `applications/${name}`, tags }, name, type: "app" },
      ]),
    ),
  };
}

/** Writes a project holding the given files under a fresh temp directory. */
async function buildProject(
  files: Record<string, string>,
): Promise<{ absoluteRoot: string }> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codependix-imports-python-"),
  );

  for (const [name, text] of Object.entries(files)) {
    await mkdir(path.join(workspaceRoot, path.dirname(name)), {
      recursive: true,
    });
    await writeFile(path.join(workspaceRoot, name), text, "utf8");
  }

  return { absoluteRoot: workspaceRoot };
}

describe(PythonProjectService, () => {
  let service: PythonProjectService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PythonProjectService],
    }).compile();

    service = await module.resolve(PythonProjectService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("describes a project by its root and Nx name", () => {
    expect(
      service.describeProject(
        "/workspace/applications/affirmations",
        "affirmations",
      ),
    ).toStrictEqual({
      absoluteRoot: "/workspace/applications/affirmations",
      name: "affirmations",
    });
  });

  describe("isPythonProject", () => {
    it("reports true when a project's tags include language:python", () => {
      const graph = buildGraph({ affirmations: ["language:python"] });

      expect(service.isPythonProject(graph, "affirmations")).toBe(true);
    });

    it("reports false when a project's tags do not include language:python", () => {
      const graph = buildGraph({ lexico: ["language:typescript"] });

      expect(service.isPythonProject(graph, "lexico")).toBe(false);
    });

    it("reports false for a project the graph does not know about", () => {
      const graph = buildGraph({});

      expect(service.isPythonProject(graph, "unknown")).toBe(false);
    });
  });

  describe("discoverProjects", () => {
    it("keeps only the projects tagged language:python", () => {
      const graph = buildGraph({
        affirmations: ["language:python"],
        lexico: ["language:typescript"],
      });

      const discovered = service.discoverProjects(graph, [
        {
          absoluteRoot: "/workspace/applications/affirmations",
          name: "affirmations",
        },
        { absoluteRoot: "/workspace/applications/lexico", name: "lexico" },
      ]);

      expect(discovered.map((project) => project.name)).toStrictEqual([
        "affirmations",
      ]);
    });

    it("describes each discovered project", () => {
      const graph = buildGraph({ affirmations: ["language:python"] });

      const discovered = service.discoverProjects(graph, [
        {
          absoluteRoot: "/workspace/applications/affirmations",
          name: "affirmations",
        },
      ]);

      expect(discovered).toStrictEqual([
        {
          absoluteRoot: "/workspace/applications/affirmations",
          name: "affirmations",
        },
      ]);
    });
  });

  describe("listSourceFileNames", () => {
    it("lists every .py file beneath a project, sorted", async () => {
      const project = await buildProject({
        "src/__init__.py": "",
        "src/grammars.py": "",
        "src/models.py": "",
      });

      expect(
        service.listSourceFileNames({
          absoluteRoot: project.absoluteRoot,
          name: "example",
        }),
      ).toStrictEqual(
        ["src/__init__.py", "src/grammars.py", "src/models.py"].map((name) =>
          path.join(project.absoluteRoot, name),
        ),
      );
    });

    it("excludes files under __pycache__ and other excluded directories", async () => {
      const project = await buildProject({
        "src/__pycache__/grammars.cpython-312.pyc": "",
        "src/grammars.py": "",
      });

      expect(
        service.listSourceFileNames({
          absoluteRoot: project.absoluteRoot,
          name: "example",
        }),
      ).toStrictEqual([path.join(project.absoluteRoot, "src/grammars.py")]);
    });

    it("excludes non-Python files", async () => {
      const project = await buildProject({
        "README.md": "# example\n",
        "src/grammars.py": "",
      });

      expect(
        service.listSourceFileNames({
          absoluteRoot: project.absoluteRoot,
          name: "example",
        }),
      ).toStrictEqual([path.join(project.absoluteRoot, "src/grammars.py")]);
    });
  });
});
