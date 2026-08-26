import { DeliveryService } from "@codependix/cli";
import { Injectable } from "@nestjs/common";

import { resolveFixture } from "../../constants";
import { NestjsGraphsService } from "../nestjs-graphs/nestjs-graphs.service";
import {
  ATLAS_CHAIN,
  SUBJECT_PROJECT_NAME,
} from "../nx-graphs/nx-graphs.constants";
import { NxGraphsService } from "../nx-graphs/nx-graphs.service";
import { PythonImportsService } from "../python-imports/python-imports.service";
import { TypescriptImportsService } from "../typescript-imports/typescript-imports.service";

import {
  ATLAS_FIXTURES_SEGMENT,
  ATLAS_PYTHON_ROOT,
  ATLAS_SERVICE_ROOT,
  IMPORTS_JSON_FILE,
  MODULE_JSON_FILE,
  NEIGHBORHOOD_JSON_FILE,
  PYTHON_IMPORTS_JSON_FILE,
  WORKSPACE_JSON_FILE,
} from "./graph-levels.constants";

import type {
  ExampleDocument,
  ExampleJsonExport,
} from "../examples/examples.types";
import type { GraphLevel } from "./graph-levels.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Puts all four graph levels beside each other, built from one fixture.
 *
 * The value of this example is entirely comparative: the Neighborhood says
 * which projects `atlas-service` sits between, the Workspace Graph says what
 * the whole repository looks like, the module graph says how its NestJS
 * container is wired, and the two import graphs say which of its own files
 * reach which. None of them is a substitute for another, and a reader choosing
 * a level is choosing which question to ask.
 *
 * It is also the embedding example. Nothing here goes through the command line
 * or reads a configuration file: `@codependix/cli` holds only orchestration and
 * delivery, so a host that wants a graph in memory injects the four builders
 * and calls them, exactly as this service does.
 */
@Injectable()
/* v8 ignore stop */
export class GraphLevelsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly nestjsGraphsService: NestjsGraphsService,
    private readonly nxGraphsService: NxGraphsService,
    private readonly pythonImportsService: PythonImportsService,
    private readonly typescriptImportsService: TypescriptImportsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the embedding example, which describes what this service just did. */
  private buildEmbeddingDocument(): ExampleDocument {
    return {
      id: "09-embedding",
      jsonExports: [],
      sections: [
        {
          body: "```ts\nconstructor(\n  private readonly moduleGraphService: ModuleGraphService,\n  private readonly neighborhoodService: NeighborhoodService,\n  private readonly nestjsProjectService: NestjsProjectService,\n  private readonly pythonService: PythonService,\n  private readonly typescriptService: TypescriptService,\n  private readonly workspaceGraphService: WorkspaceGraphService,\n) {}\n```",
          heading: "The six collaborators a host injects",
          note: "Every one of them comes from `@codependix/nx`, `@codependix/nestjs`, or `@codependix/imports`. None comes from `@codependix/cli`.",
        },
        {
          body: "`NeighborhoodService.readProjectGraph` is the only method in any of the three packages that reaches for a live workspace — it calls `createProjectGraphAsync()`, which resolves the Nx workspace from the process working directory and takes no directory argument. `--directory` supplies only the root that export paths are resolved against. Every other method is handed the graph, the project, or the program it works on, which is what lets this package graph fixtures at all.",
          heading: "The one method that reads the process working directory",
          note: "This is the constraint that decided this package's shape — see the README's `Why the fixtures are not a nested workspace`.",
        },
        {
          body: "`@codependix/cli` adds three things and nothing else: a command line with exactly two modes, `ConfigurationService` resolving where each project's export goes, and `DeliveryService` turning that into file I/O. A host wanting a graph in memory needs none of them.",
          heading: "What the command line adds",
          note: "The split is why this package can render every diagram in these examples without a `codependix.config.ts` anywhere near it.",
        },
      ],
      summary:
        "The graph builders are injectable services with no command line and no configuration file between them and a caller. This whole package is the proof.",
      title: "9. Embedding the graph builders directly",
    };
  }

  /** Builds the JSON export of each of the five graphs, as a run would write it. */
  private async buildJsonExports(): Promise<ExampleJsonExport[]> {
    const neighborhood = this.nxGraphsService.buildNeighborhood(
      ATLAS_CHAIN,
      SUBJECT_PROJECT_NAME,
    );

    return [
      {
        content: this.renderJson(neighborhood),
        fileName: NEIGHBORHOOD_JSON_FILE,
      },
      {
        content: this.renderJson(
          this.nxGraphsService.buildWorkspaceGraphFor(ATLAS_CHAIN),
        ),
        fileName: WORKSPACE_JSON_FILE,
      },
      {
        content: this.renderJson(
          await this.nestjsGraphsService.buildGraphAt(
            this.resolveServiceRoot(),
          ),
        ),
        fileName: MODULE_JSON_FILE,
      },
      {
        content: this.renderJson(
          this.typescriptImportsService.buildGraphAt(this.resolveServiceRoot()),
        ),
        fileName: IMPORTS_JSON_FILE,
      },
      {
        content: this.renderJson(
          this.pythonImportsService.buildGraphAt(this.resolvePythonRoot()),
        ),
        fileName: PYTHON_IMPORTS_JSON_FILE,
      },
    ];
  }

  /** Renders a value the way `codependix --write` renders every JSON export. */
  private renderJson(value: unknown): string {
    return this.deliveryService.renderJson(value);
  }

  /** Resolves the fixture project's Python package root. */
  private resolvePythonRoot(): string {
    return resolveFixture(ATLAS_FIXTURES_SEGMENT, ATLAS_PYTHON_ROOT);
  }

  /** Resolves the fixture project's root on disk. */
  private resolveServiceRoot(): string {
    return resolveFixture(ATLAS_FIXTURES_SEGMENT, ATLAS_SERVICE_ROOT);
  }

  // 🌎 Public Methods

  /** Builds the cross-level and embedding example documents. */
  async build(): Promise<ExampleDocument[]> {
    const levels = await this.buildLevels();

    return [
      {
        id: "01-graph-levels",
        jsonExports: await this.buildJsonExports(),
        sections: levels.map((level) => ({
          body: level.diagram,
          heading: level.title,
          note: level.note,
        })),
        summary:
          "One fixture project, `atlas-service`, graphed at all four levels codependix builds — so a reader sees what each level does and does not say about the same code.",
        title: "1. The four graph levels, side by side",
      },
      this.buildEmbeddingDocument(),
    ];
  }

  /** Renders each of the four levels for the shared fixture project. */
  async buildLevels(): Promise<GraphLevel[]> {
    return [
      {
        diagram: this.nxGraphsService.renderNeighborhood(
          ATLAS_CHAIN,
          SUBJECT_PROJECT_NAME,
        ),
        note: "Which workspace projects `atlas-service` sits between. It says nothing about what is inside the project.",
        title: "Nx Neighborhood",
      },
      {
        diagram: this.nxGraphsService.renderWorkspaceGraph(ATLAS_CHAIN),
        note: "The same edges, drawn once for the whole repository rather than once per project, with no project highlighted.",
        title: "Nx Workspace Graph",
      },
      {
        diagram: await this.nestjsGraphsService.renderAt(
          this.resolveServiceRoot(),
        ),
        note: "How the project's own NestJS container is wired. Only modules are nodes — `CatalogService` is a provider and never appears.",
        title: "NestJS module graph",
      },
      {
        diagram: this.typescriptImportsService.renderAt(
          this.resolveServiceRoot(),
        ),
        note: "Which of the project's own TypeScript files import which. `settings.ts` is invisible to the module graph above and central here.",
        title: "TypeScript file imports",
      },
      {
        diagram: this.pythonImportsService.renderAt(this.resolvePythonRoot()),
        note: "The same question asked of the project's Python package, answered by a statement scanner rather than by a compiler.",
        title: "Python file imports",
      },
    ];
  }
}
