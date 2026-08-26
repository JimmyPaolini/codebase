import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";
import { Injectable } from "@nestjs/common";

import {
  ATLAS_CHAIN,
  ATLAS_CHAIN_AFTER_DRIFT,
  ATLAS_DOUBLE_DECLARED,
  ATLAS_EXTERNAL,
  ATLAS_INFERRED,
  ATLAS_SELF_DEPENDENT,
  ATLAS_UNCONNECTED,
  FIXTURE_WORKSPACE_ROOT,
  SUBJECT_PROJECT_NAME,
} from "./nx-graphs.constants";

import type {
  ExampleDocument,
  ExampleSection,
} from "../examples/examples.types";
import type { FixtureWorkspace } from "./nx-graphs.types";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";
import type { ProjectGraph } from "@nx/devkit";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Builds the Nx Neighborhood and Workspace Graph examples from fixture
 * project graphs.
 *
 * `NeighborhoodService.readProjectGraph` is the one method here that reaches
 * for a live workspace: it calls `createProjectGraphAsync()`, which resolves
 * the Nx workspace from the process working directory and takes no directory
 * argument. Every other method — `readProjects`, `buildNeighborhoods`,
 * `collectEdges`, `renderMermaid`, and `WorkspaceGraphService`'s pair — is
 * handed the graph, so an example hands it one this package wrote instead.
 */
@Injectable()
/* v8 ignore stop */
export class NxGraphsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly neighborhoodService: NeighborhoodService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the drift example, comparing one project's Neighborhood before and after. */
  private buildDriftDocument(): ExampleDocument {
    return {
      id: "16-workspace-drift",
      jsonExports: [],
      sections: [
        {
          body: this.renderNeighborhood(ATLAS_CHAIN, "atlas-core"),
          heading: "Before the change",
          note: "`atlas-core` sits at the bottom of the chain, with one dependent.",
        },
        {
          body: this.renderNeighborhood(ATLAS_CHAIN_AFTER_DRIFT, "atlas-core"),
          heading: "After an edge is added elsewhere",
          note: "`atlas-application` gained a direct dependency on `atlas-core`. Nothing inside `atlas-core` changed, and its Neighborhood did.",
        },
        {
          body: "An export moves with the workspace it describes, not with the project it is written into. A `--check` run on a branch that changed any project graph therefore fails for projects the branch never touched — which is why `codebase:codependix` runs `write` on the default branch only, after `callidescope` and the module-graph synchronization, so every project's `## 🕸️ Codependix` anchor reflects one commit.",
          heading: "Why no pull request gates on this",
          note: "The failure above is real drift, and it is drift no reviewer of that branch can act on.",
        },
      ],
      summary:
        "Why this repository runs `codependix --write` on the default branch and gates no pull request on `codependix --check`.",
      title: "16. An export moves with the workspace, not with the project",
    };
  }

  /** Builds the sections covering the renderer's per-edge rules. */
  private buildRuleSections(): ExampleSection[] {
    return [
      {
        body: this.renderNeighborhood(ATLAS_INFERRED, "atlas-application"),
        heading: "A dependency Nx inferred from configuration",
        note: "Drawn with a dashed arrow, and `NEIGHBORHOOD_IMPLICIT_LEGEND` is appended under the diagram to say so.",
      },
      {
        body: this.renderNeighborhood(
          ATLAS_DOUBLE_DECLARED,
          "atlas-application",
        ),
        heading: "A pair declared both statically and implicitly",
        note: "The static edge wins, because it is the stronger statement — the arrow is solid and no legend appears.",
      },
      {
        body: this.renderNeighborhood(
          ATLAS_SELF_DEPENDENT,
          SUBJECT_PROJECT_NAME,
        ),
        heading: "A project depending on itself",
        note: "The self-edge is dropped. Only the edge to `atlas-core` survives.",
      },
      {
        body: this.renderNeighborhood(ATLAS_EXTERNAL, SUBJECT_PROJECT_NAME),
        heading: "A dependency on an external package",
        note: "`npm:zod` is not a known workspace project, so the edge is dropped rather than drawn as an external node.",
      },
      {
        body: this.renderNeighborhood(ATLAS_UNCONNECTED, SUBJECT_PROJECT_NAME),
        heading: "A project with no neighbors at all",
        note: "`NEIGHBORHOOD_UNCONNECTED` is rendered in place of a diagram.",
      },
      {
        body: `\`\`\`text\n${this.readProjects(ATLAS_CHAIN)
          .map((project) => project.name)
          .join("\n")}\n\`\`\``,
        heading: "The workspace root project",
        note: "`atlas-workspace` is rooted at `.` and is absent from the projects list entirely: it contains every project rather than depending on them, so its Neighborhood would say nothing.",
      },
    ];
  }

  /** Builds the Neighborhood rule examples, one section per rule. */
  private buildScopeDocument(): ExampleDocument {
    return {
      id: "02-neighborhood-scope",
      jsonExports: [],
      sections: [...this.buildScopeSections(), ...this.buildRuleSections()],
      summary:
        "A Neighborhood is one hop in each direction, and that is the point. Beside it, the Workspace Graph of the same fixture, and one fixture per rule the renderer applies.",
      title: "2. One hop, and every rule the renderer applies",
    };
  }

  /** Builds the two sections contrasting a Neighborhood with the Workspace Graph. */
  private buildScopeSections(): ExampleSection[] {
    return [
      {
        body: this.renderNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME),
        heading: "The middle project's Neighborhood",
        note: "`atlas-service` holds only its immediate dependency and its immediate dependent. The highlighted node is the `classDef subject` style that marks which project the diagram is centered on.",
      },
      {
        body: this.renderWorkspaceGraph(ATLAS_CHAIN),
        heading: "The Workspace Graph of the same fixture",
        note: "The whole chain, exported once for the repository rather than once per project, and with no project highlighted.",
      },
    ];
  }

  // 🌎 Public Methods

  /** Builds every Nx example document. */
  build(): ExampleDocument[] {
    return [this.buildScopeDocument(), this.buildDriftDocument()];
  }

  /** Builds one project's Neighborhood from a fixture workspace. */
  buildNeighborhood(
    workspace: FixtureWorkspace,
    projectName: string,
  ): Neighborhood | undefined {
    const graph = this.buildProjectGraph(workspace);

    return this.neighborhoodService
      .buildNeighborhoods(graph, this.readProjects(workspace))
      .get(projectName);
  }

  /** Turns a fixture workspace description into a real `ProjectGraph`. */
  buildProjectGraph(workspace: FixtureWorkspace): ProjectGraph {
    const dependencies: ProjectGraph["dependencies"] = {};

    for (const dependency of workspace.dependencies) {
      dependencies[dependency.source] = [
        ...(dependencies[dependency.source] ?? []),
        dependency,
      ];
    }

    return {
      dependencies,
      nodes: Object.fromEntries(
        workspace.projects.map((project) => [
          project.name,
          {
            data: { root: project.root },
            name: project.name,
            type: "lib" as const,
          },
        ]),
      ),
    };
  }

  /** Builds a fixture workspace's whole-repository Workspace Graph. */
  buildWorkspaceGraphFor(workspace: FixtureWorkspace): WorkspaceGraph {
    return this.workspaceGraphService.buildWorkspaceGraph(
      this.buildProjectGraph(workspace),
      this.readProjects(workspace),
    );
  }

  /** Lists the projects a fixture workspace's graph reports, root excluded. */
  readProjects(workspace: FixtureWorkspace): NxProject[] {
    return this.neighborhoodService.readProjects(
      this.buildProjectGraph(workspace),
      FIXTURE_WORKSPACE_ROOT,
    );
  }

  /** Renders one project's Neighborhood from a fixture workspace. */
  renderNeighborhood(workspace: FixtureWorkspace, projectName: string): string {
    const neighborhood = this.buildNeighborhood(workspace, projectName);

    /* v8 ignore next -- every fixture names a project its own graph holds */
    if (neighborhood === undefined) return "";

    return this.neighborhoodService.renderMermaid(neighborhood);
  }

  /** Renders a fixture workspace's whole-repository Workspace Graph. */
  renderWorkspaceGraph(workspace: FixtureWorkspace): string {
    return this.workspaceGraphService.renderMermaid(
      this.buildWorkspaceGraphFor(workspace),
    );
  }
}
