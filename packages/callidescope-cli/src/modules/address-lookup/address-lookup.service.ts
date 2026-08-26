import { AddressService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { CallidescopeService } from "../callidescope/callidescope.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import type {
  LookupAddressArguments,
  LookupAddressOutcome,
} from "./address-lookup.types";
import type { CallableAddressResolution } from "@callidescope/graph";

/**
 * Resolves `depth` and `breadth`'s callable address into a callable, sharing
 * every step the two commands would otherwise duplicate: loading the
 * configuration, tracing the workspace, and matching the address against
 * what was found.
 */
@Injectable()
export class AddressLookupService {
  // 🏗 Dependency Injection

  constructor(
    private readonly addressService: AddressService,
    private readonly callidescopeService: CallidescopeService,
    private readonly runPlanService: RunPlanService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * States why a resolution cannot be acted on, or nothing when it can.
   *
   * One message per failure kind rather than a generic "not found": an
   * invalid address, an address matching nothing, and an address matching
   * several declarations are each fixed a different way, and only the message
   * for the one that actually happened tells the caller which.
   */
  public describeProblem(args: {
    address: string;
    resolution: CallableAddressResolution;
  }): string | undefined {
    const { resolution } = args;

    if (resolution.kind === "resolved") {
      return undefined;
    }

    if (resolution.kind === "invalid") {
      return resolution.reason;
    }

    if (resolution.kind === "not-found") {
      return `No callable matches "${args.address}". Check the file path and the qualified name callidescope prints for it in a stack.`;
    }

    const candidates = resolution.candidates
      .map(
        (candidate) =>
          `${candidate.location.filePath}:${String(candidate.location.line)}`,
      )
      .join(", ");

    return `"${args.address}" matches more than one declaration: ${candidates}. Add ":<line>" to the address to pick one.`;
  }

  /** Loads the configuration, traces the workspace, and matches the address. */
  public async lookup(
    args: LookupAddressArguments,
  ): Promise<LookupAddressOutcome> {
    const { configuration, workspaceRoot } =
      await this.runPlanService.prepareLookup(args.options);
    const located = this.callidescopeService.locate({
      configuration,
      directories: args.options.directories ?? configuration.directories,
      workspaceRoot,
    });
    const resolution = this.addressService.resolve({
      address: args.address,
      callablesById: located.callablesById,
      workspaceRoot,
    });

    return { configuration, located, resolution };
  }
}
