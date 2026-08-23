import { Injectable } from "@nestjs/common";

import { EdgesService } from "../edges/edges.service";
import { BreadthService } from "../graph/breadth.service";
import { ComponentsService } from "../graph/components.service";
import { DepthService } from "../graph/depth.service";
import { GraphService } from "../graph/graph.service";

import type {
  AssembledGraph,
  AssembleGraphArguments,
} from "./graph-assembly.types";
import type { CallableId, ModuleId } from "@callidescope/configuration";

/**
 * Builds the call graph, its cycle condensation, and its depth measurement.
 *
 * Extracted out of `CallidescopeService` because the three findings only mean
 * something computed together, and grouping their four collaborators behind
 * one call is what keeps `CallidescopeService`'s own constructor within the
 * repository's parameter limit as new dependencies join it.
 */
@Injectable()
export class GraphAssemblyService {
  // 🏗 Dependency Injection

  constructor(
    private readonly breadthService: BreadthService,
    private readonly componentsService: ComponentsService,
    private readonly depthService: DepthService,
    private readonly edgesService: EdgesService,
    private readonly graphService: GraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Builds the call graph and everything derived from it. */
  public assemble(args: AssembleGraphArguments): AssembledGraph {
    const graph = this.graphService.assemble(
      this.edgesService.build({
        callablesById: args.callablesById,
        includeConstructorEdges: args.includeConstructorEdges,
        workspaceRoot: args.workspaceRoot,
      }),
    );
    const condensed = this.componentsService.condense({
      callableIds: args.callablesById.keys(),
      graph,
    });
    const moduleIdByCallable = new Map<CallableId, ModuleId>(
      [...args.callablesById].map(([callableId, callable]) => [
        callableId,
        callable.node.moduleId,
      ]),
    );

    return {
      breadthMeasurement: this.breadthService.measure({
        callableIds: [...args.callablesById.keys()],
        graph,
      }),
      condensed,
      graph,
      measurement: this.depthService.measure({
        condensed,
        graph,
        moduleIdByCallable,
      }),
    };
  }
}
