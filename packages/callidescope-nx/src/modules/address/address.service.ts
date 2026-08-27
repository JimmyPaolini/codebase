import { AddressLookupService, AddressReportService } from "@callidescope/cli";
import { AddressDepthService, BreadthService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import type { LookupArguments, LookupResult } from "./address.types";
import type { LocatedWorkspace } from "@callidescope/cli";
import type { CallableId } from "@callidescope/configuration";

/**
 * Answers `depth` and `breadth` about one callable, inside a resolved
 * selection of Nx projects.
 *
 * The lookup itself is callidescope's — this only decides what it is asked
 * about. What the plugin adds is the scope: the CLI resolves an address
 * against the whole workspace, while here it is resolved against one project
 * and its Nx dependencies, which is both faster and the set the address
 * actually belongs to.
 */
@Injectable()
export class AddressService {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressLookupService: AddressLookupService,
    private readonly addressReportService: AddressReportService,
    private readonly addressDepthService: AddressDepthService,
    private readonly breadthService: BreadthService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Resolves one address, or explains why it could not be.
   *
   * The explanation is returned rather than logged: an executor's product is
   * what it writes to stdout, and a reader looking at a failed task needs the
   * reason in the same place the report would have been.
   */
  private async locate(
    args: LookupArguments,
  ): Promise<string | { id: CallableId; workspace: LocatedWorkspace }> {
    const workspace = await this.addressLookupService.locate({
      ...(args.configurationPath === undefined
        ? {}
        : { config: args.configurationPath }),
      directories: [...args.directories],
      ...(args.format === undefined ? {} : { format: args.format }),
      // Nothing can be prompted for inside a task runner.
      interactive: false,
    });
    const resolution = this.addressLookupService.resolve({
      address: args.address,
      workspace,
    });
    const problem = this.addressLookupService.describeProblem({
      address: args.address,
      resolution,
    });

    if (problem !== undefined || resolution.kind !== "resolved") {
      return problem ?? `"${args.address}" resolved to nothing.`;
    }

    return { id: resolution.id, workspace };
  }

  // 🌎 Public Methods

  /** Prints the callable's direct callers and callees, side by side. */
  public async runBreadth(args: LookupArguments): Promise<LookupResult> {
    const located = await this.locate(args);

    if (typeof located === "string") {
      return { ok: false, report: located };
    }

    const { id, workspace } = located;
    const callable = workspace.located.callablesById.get(id);

    if (callable === undefined) {
      return {
        ok: false,
        report: `"${args.address}" resolved to a callable that was not traced.`,
      };
    }

    return {
      ok: true,
      report: this.addressReportService.renderBreadth({
        address: args.address,
        directCalls: this.breadthService.describeDirectCalls({
          callablesById: workspace.located.callablesById,
          graph: workspace.located.graph,
          id,
        }),
        displayName: callable.node.displayName,
        format: workspace.configuration.output.format,
        id,
        location: callable.node.location,
      }),
    };
  }

  /** Prints every call stack above and below the callable. */
  public async runDepth(args: LookupArguments): Promise<LookupResult> {
    const located = await this.locate(args);

    if (typeof located === "string") {
      return { ok: false, report: located };
    }

    const { id, workspace } = located;
    const stackArguments = {
      callablesById: workspace.located.callablesById,
      graph: workspace.located.graph,
      startId: id,
    };

    return {
      ok: true,
      report: this.addressReportService.renderDepth({
        address: args.address,
        downward: this.addressDepthService.buildDownwardStacks(stackArguments),
        format: workspace.configuration.output.format,
        upward: this.addressDepthService.buildUpwardStacks(stackArguments),
      }),
    };
  }
}
