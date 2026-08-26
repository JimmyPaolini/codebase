import path from "node:path";

import { PythonService } from "@codependix/imports";
import { Injectable } from "@nestjs/common";

import { resolveFixture } from "../../constants";

import {
  PYTHON_FIXTURES_SEGMENT,
  PYTHON_PROJECT_TAG,
  SCANNER_CASES,
  SCANNER_FIXTURE,
  SCANNER_NON_CASES,
} from "./python-imports.constants";

import type { ExampleDocument } from "../examples/examples.types";
import type { ScannerCase } from "./python-imports.types";
import type { PythonImportGraph, PythonProject } from "@codependix/imports";
import type { ProjectGraph } from "@nx/devkit";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Builds the Python file-level import graph examples.
 *
 * There is no `ts.Program` equivalent reachable from Node, so Python statements
 * are recognized by a small hand-rolled scanner: comments and quoted strings
 * are stripped, continuation lines are rejoined by tracking parenthesis depth
 * and trailing backslashes, and only statements starting at column zero are
 * considered. That last one is the rule a reader is most likely to guess
 * wrong — an import nested inside a function or an `if TYPE_CHECKING:` block is
 * deliberately not walked, mirroring the fact that a TypeScript `import`
 * declaration can only ever appear at module scope.
 *
 * Discovery is gated on the `language:python` Nx tag rather than on a marker
 * file, since every Python project in this workspace shares one workspace-root
 * `pyproject.toml`. A fixture is not an Nx project, so the examples hand
 * discovery a project graph that carries the tag — which is itself the clearest
 * way to show the gate.
 */
@Injectable()
/* v8 ignore stop */
export class PythonImportsService {
  // 🏗 Dependency Injection

  constructor(private readonly pythonService: PythonService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders one of the two scanner tables. */
  private renderCases(cases: ScannerCase[]): string {
    const rows = cases.map(
      (scannerCase) =>
        `| \`${scannerCase.file}\` | ${scannerCase.description} |`,
    );

    return ["| File | Case |", "| ---- | ---- |", ...rows].join("\n");
  }

  // 🌎 Public Methods

  /** Builds every Python import-graph example document. */
  build(): ExampleDocument[] {
    const graph = this.buildFixtureGraph(SCANNER_FIXTURE);

    return [
      {
        id: "07-python-scanner",
        jsonExports: [],
        sections: [
          {
            body: this.renderFixture(SCANNER_FIXTURE),
            heading: "The scanned graph",
            note: "Every edge here came out of the hand-rolled statement scanner, resolved against the filesystem the way `ts.resolveModuleName` resolves against a compiler host.",
          },
          {
            body: this.renderCases(SCANNER_CASES),
            heading: "Every case the scanner handles",
            note: "Each one is a real file in `fixtures/python/scanner/`, and each one contributes an edge to the diagram above.",
          },
          {
            body: this.renderCases(SCANNER_NON_CASES),
            heading: "The statements deliberately not walked",
            note: "Choices rather than gaps. Only statements starting at column zero are considered, and an edge is kept only when it resolves to a file the project owns.",
          },
          {
            body: `\`\`\`text\n${graph.isolatedFileNames.join("\n")}\n\`\`\``,
            heading: "Files left with no edge in either direction",
            note: "`nested.py` is here precisely because its two imports are not walked, which is the claim made visible rather than asserted.",
          },
          {
            body: "`.git`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`, `.venv`, `__pycache__`, and `node_modules` are walked past rather than into. None of them can be committed here — this repository's `.gitignore` claims every one — so the exclusion is proved by a unit test that creates a `__pycache__` directory at run time and checks it never reaches the graph.",
            heading: "Directories the walk never enters",
            note: "`PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES` names them.",
          },
        ],
        summary:
          "Python imports are scanned, not compiled — so every case the scanner handles, and every case it deliberately refuses, has a fixture.",
        title: "7. The whole surface of the Python statement scanner",
      },
    ];
  }

  /** Builds one fixture project's import graph. */
  buildFixtureGraph(fixtureName: string): PythonImportGraph {
    return this.pythonService.buildGraph(this.describeFixture(fixtureName));
  }

  /** Builds one project's import graph, given its root on disk. */
  buildGraphAt(absoluteRoot: string): PythonImportGraph {
    return this.pythonService.buildGraph(this.describeProjectAt(absoluteRoot));
  }

  /**
   * Builds the tagged project graph `PythonService.discoverProjects` reads.
   *
   * A fixture is not an Nx project, so the tag it would have carried is
   * supplied here — which is also the plainest demonstration of the gate:
   * drop the tag and the project is not discovered at all.
   */
  buildTaggedGraph(projectName: string, projectRoot: string): ProjectGraph {
    return {
      dependencies: {},
      nodes: {
        [projectName]: {
          data: { root: projectRoot, tags: [PYTHON_PROJECT_TAG] },
          name: projectName,
          type: "lib",
        },
      },
    };
  }

  /** Describes a fixture the way tag-gated project discovery would have. */
  describeFixture(fixtureName: string): PythonProject {
    return this.describeProjectAt(
      resolveFixture(PYTHON_FIXTURES_SEGMENT, fixtureName),
    );
  }

  /** Describes a project rooted anywhere on disk, through real discovery. */
  describeProjectAt(absoluteRoot: string): PythonProject {
    const name = path.basename(absoluteRoot);
    const [project] = this.pythonService.discoverProjects(
      this.buildTaggedGraph(name, absoluteRoot),
      [{ absoluteRoot, name }],
    );

    if (project === undefined) {
      throw new Error(`No ${PYTHON_PROJECT_TAG} project at ${absoluteRoot}`);
    }

    return project;
  }

  /** Renders one project's import graph, given its root on disk. */
  renderAt(absoluteRoot: string): string {
    return this.pythonService.renderMermaid(this.buildGraphAt(absoluteRoot));
  }

  /** Renders one fixture project's import graph as a mermaid diagram. */
  renderFixture(fixtureName: string): string {
    return this.pythonService.renderMermaid(
      this.buildFixtureGraph(fixtureName),
    );
  }
}
