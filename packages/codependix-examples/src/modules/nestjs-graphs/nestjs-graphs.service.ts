import path from "node:path";

import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { Injectable } from "@nestjs/common";

import { resolveFixture } from "../../constants";

import {
  BOUNDARY_CONTAINER,
  EMPTY_CONTAINER,
  FAILING_CONTAINER,
  GLOBAL_CONTAINER,
  NESTJS_FIXTURES_SEGMENT,
  PREVIEW_CONTAINER,
  ROOTED_APPLICATION,
  SMALL_CONTAINER,
} from "./nestjs-graphs.constants";

import type {
  ExampleDocument,
  ExampleSection,
} from "../examples/examples.types";
import type { FixtureExploration } from "./nestjs-graphs.types";
import type { NestjsModuleGraph, NestjsProject } from "@codependix/nestjs";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Explores the NestJS fixture containers and renders their module graphs.
 *
 * Every container here is explored the way a real run explores one — through
 * `NestjsProjectService.exploreProject`, which boots it in NestJS preview mode
 * so every module and provider is registered and none is instantiated. That is
 * the claim the `preview-container` fixture exists to prove rather than assert:
 * its options factory throws if it is ever called, and exploring it succeeds.
 *
 * Project discovery is the one part not exercised here.
 * `NestjsProjectService.discoverProjects` filters an Nx project graph by the
 * `framework:nestjs` tag, and a fixture is not an Nx project — so each fixture
 * is described directly with `describeProject`, which is the same shape
 * discovery would have produced.
 */
@Injectable()
/* v8 ignore stop */
export class NestjsGraphsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the ambient-module heuristic example. */
  private async buildAmbientDocument(): Promise<ExampleDocument> {
    const sections = await this.buildAmbientSections();

    return {
      id: "03-ambient-modules",
      jsonExports: [],
      sections,
      summary:
        "`SpelunkerModule.explore` reports the container's view rather than the decorators', so a `@Global()` module arrives as an import of every other module. Drawn literally it would bury the structure worth reading, so its edges are left out and it is drawn as a rounded node.",
      title: "3. The ambient-module heuristic",
    };
  }

  /** Builds the four sections of the ambient-module example. */
  private async buildAmbientSections(): Promise<ExampleSection[]> {
    return [
      {
        body: await this.renderFixture(GLOBAL_CONTAINER),
        heading: "A container with a global module",
        note: "`SettingsModule` is `@Global()`, so NestJS registers it into all three other modules. Four modules meets `MODULE_GRAPH_AMBIENT_MINIMUM_MODULES`, so it is drawn as a rounded node with its edges left out, and `MODULE_GRAPH_AMBIENT_LEGEND` is appended.",
      },
      {
        body: await this.renderFixture(SMALL_CONTAINER),
        heading: "The same global module in a three-module container",
        note: "`MODULE_GRAPH_AMBIENT_MINIMUM_MODULES` is 4, and this container has three modules — below that, a module imported by everything else is just a small graph, so the edges are drawn.",
      },
      {
        body: await this.renderFixture(BOUNDARY_CONTAINER),
        heading: "A plain module imported by every other module",
        note: "`SettingsModule` here carries no `@Global()` decorator at all. The rule counts inbound edges rather than reading decorators, so four inbound edges in a five-module container reaches the same threshold — the heuristic at its boundary.",
      },
      {
        body: await this.renderFixture(EMPTY_CONTAINER),
        heading: "A project defining no modules",
        note: "`MODULE_GRAPH_UNCONNECTED` is rendered in place of a diagram.",
      },
    ];
  }

  /** Builds the preview-mode example. */
  private async buildPreviewDocument(): Promise<ExampleDocument> {
    return {
      id: "04-preview-mode",
      jsonExports: [],
      sections: [
        {
          body: await this.renderFixture(PREVIEW_CONTAINER),
          heading:
            "A container whose options factory would reach outside the process",
          note: "`CatalogModule` imports `ConnectionModule.forRootAsync({ useFactory })`, and that factory throws if it is ever called. This diagram exists, so it never was.",
        },
        {
          body: "`NestjsProjectService.exploreProject` calls `NestFactory.createApplicationContext(rootModule, { abortOnError: false, logger: false, preview: true })`. Preview mode registers every module and provider and instantiates none of them, so a `TypeOrmModule.forRootAsync` options factory never has a database contacted — from a workstation or from a CI runner alike.",
          heading: "Why the factory never ran",
          note: "This is the question anyone deciding whether to point codependix at their own application is actually asking.",
        },
      ],
      summary:
        "Preview mode is what makes exploring an unfamiliar container safe: a module whose options factory would contact something is graphed without that factory ever running.",
      title: "4. Preview mode, and why exploration is safe",
    };
  }

  /** Builds the container-rooting example. */
  private async buildRootingDocument(): Promise<ExampleDocument> {
    const explorations = await this.exploreAll([
      ROOTED_APPLICATION,
      EMPTY_CONTAINER,
      FAILING_CONTAINER,
    ]);

    return {
      id: "05-container-rooting",
      jsonExports: [],
      sections: [
        {
          body: await this.renderFixture(ROOTED_APPLICATION),
          heading: "A project that bootstraps a root module",
          note: "`src/main.module.ts` exists, so its `MainModule` export is the root and the container is explored outward from it. `OrphanModule` is defined in the same directory and never imported, so it is absent.",
        },
        {
          body: await this.renderFixture(SMALL_CONTAINER),
          heading: "A package that bootstraps nothing",
          note: "No `src/main.module.ts`, so every `*.module.ts` under `src/` is loaded and rooted under a synthetic module. That synthetic root, and the global `ConfigModule` it supplies so a module reading configuration in a `useFactory` can be scanned at all, are both kept out of the graph.",
        },
        {
          body: this.renderExplorations(explorations),
          heading: "One project failing stops no other",
          note: "`failing-container` throws the moment its module file is imported. It is collected as a failure and the other two projects still complete — the guarantee `codependix --write` makes: either it fully succeeds, or it names exactly which projects failed.",
        },
      ],
      summary:
        "How a container is rooted when a project bootstraps one, when it bootstraps nothing, and when it refuses to load at all.",
      title: "5. Rooting a container, including one that bootstraps nothing",
    };
  }

  /** Renders a list of explorations as a fenced report. */
  private renderExplorations(explorations: FixtureExploration[]): string {
    const lines = explorations.map((exploration) =>
      exploration.outcome === "explored"
        ? `explored ${exploration.name} — ${exploration.moduleCount} module(s)`
        : `failed   ${exploration.name}: ${exploration.error}`,
    );

    return `\`\`\`text\n${lines.join("\n")}\n\`\`\``;
  }

  // 🌎 Public Methods

  /** Builds every NestJS module-graph example document. */
  async build(): Promise<ExampleDocument[]> {
    return [
      await this.buildAmbientDocument(),
      await this.buildPreviewDocument(),
      await this.buildRootingDocument(),
    ];
  }

  /** Builds one fixture container's module graph. */
  async buildFixtureGraph(fixtureName: string): Promise<NestjsModuleGraph> {
    const project = this.describeFixture(fixtureName);
    const tree = await this.nestjsProjectService.exploreProject(project);

    return this.moduleGraphService.buildGraph(tree, project.name);
  }

  /** Builds one project's module graph, given its root on disk. */
  async buildGraphAt(absoluteRoot: string): Promise<NestjsModuleGraph> {
    const project = this.describeProjectAt(absoluteRoot);
    const tree = await this.nestjsProjectService.exploreProject(project);

    return this.moduleGraphService.buildGraph(tree, project.name);
  }

  /** Describes a raised value, whether or not it was an `Error`. */
  describeError(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  }

  /** Describes a fixture the way project discovery would have described it. */
  describeFixture(fixtureName: string): NestjsProject {
    return this.nestjsProjectService.describeProject(
      resolveFixture(NESTJS_FIXTURES_SEGMENT, fixtureName),
      fixtureName,
    );
  }

  /** Describes a project rooted anywhere on disk, for cross-level examples. */
  describeProjectAt(absoluteRoot: string): NestjsProject {
    return this.nestjsProjectService.describeProject(
      absoluteRoot,
      path.basename(absoluteRoot),
    );
  }

  /** Explores several fixtures, isolating each one's failure from the rest. */
  async exploreAll(fixtureNames: string[]): Promise<FixtureExploration[]> {
    const explorations: FixtureExploration[] = [];

    for (const fixtureName of fixtureNames) {
      try {
        const graph = await this.buildFixtureGraph(fixtureName);

        explorations.push({
          moduleCount: graph.moduleNames.length,
          name: fixtureName,
          outcome: "explored",
        });
      } catch (error) {
        explorations.push({
          error: this.describeError(error),
          name: fixtureName,
          outcome: "failed",
        });
      }
    }

    return explorations;
  }

  /** Renders one project's module graph, given its root on disk. */
  async renderAt(absoluteRoot: string): Promise<string> {
    return this.moduleGraphService.renderMermaid(
      await this.buildGraphAt(absoluteRoot),
    );
  }

  /** Renders one fixture container's module graph as a mermaid diagram. */
  async renderFixture(fixtureName: string): Promise<string> {
    return this.moduleGraphService.renderMermaid(
      await this.buildFixtureGraph(fixtureName),
    );
  }
}
