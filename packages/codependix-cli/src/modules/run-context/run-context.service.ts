import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx";
import { Injectable } from "@nestjs/common";

import type { CodependixRunMode } from "../delivery/delivery.types";
import type { GraphRunContext, MapCommandOptions } from "../map/map.types";
import type { ResolvedCodependixConfiguration } from "@codependix/configuration";
import type { NxProject } from "@codependix/nx";

/**
 * Resolves everything one run reads, once, before any pass runs.
 *
 * Kept apart from the passes that read it because the two answer different
 * questions: what this workspace is, versus what to do about it. Every pass —
 * the four export passes, the Workspace Graph, and the boundary gate — is
 * handed the same resolved context rather than resolving its own, so a run
 * reads the project graph once and judges one workspace.
 */
@Injectable()
export class RunContextService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly neighborhoodService: NeighborhoodService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Narrows every project to the set `--projects` and `--tags` named.
   *
   * A run naming neither selects every project, which is what keeps the
   * Workspace Graph whole and the boundary gate judging the whole workspace by
   * default. `include`/`exclude` deliberately do not reach this: they decide
   * which projects have exports written for them, not which projects a graph
   * is drawn over.
   */
  private selectProjects(args: {
    configuration: ResolvedCodependixConfiguration;
    projects: NxProject[];
    workingDirectory: string;
  }): NxProject[] {
    return args.projects.filter((project) =>
      this.configurationService.isProjectSelected({
        configuration: args.configuration,
        projectName: project.name,
        projectRoot: path.relative(args.workingDirectory, project.absoluteRoot),
        projectTags: project.tags,
      }),
    );
  }

  // 🌎 Public Methods

  /**
   * Reads the configuration and the project graph a run is about to act on.
   *
   * Called once per run, by the command — every pass takes the context it
   * returns. `--check boundaries` reads exactly the same one, which is what
   * lets a single run both export and gate without reading the workspace
   * twice.
   */
  async build(args: {
    mode: CodependixRunMode;
    options: MapCommandOptions;
    workingDirectory: string;
  }): Promise<GraphRunContext> {
    const { mode, options, workingDirectory } = args;
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
      selection: { projects: options.projects, tags: options.tags },
    });
    const graph = await this.neighborhoodService.readProjectGraph();
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );

    return {
      configuration,
      graph,
      mode,
      projects,
      selectedProjects: this.selectProjects({
        configuration,
        projects,
        workingDirectory,
      }),
      workingDirectory,
    };
  }
}
