import { Injectable } from "@nestjs/common";

import type {
  BreadthMeasurement,
  CallableBreadth,
  MeasureBreadthArguments,
} from "./graph.types";
import type { CallableId } from "@callidescope/configuration";

/**
 * Measures how many distinct callables each callable calls directly.
 *
 * Unlike depth, this needs no condensation: a callable's direct fan-out is
 * well defined even when it sits in a cycle, since it only ever looks at its
 * own row in `calleeIdsByCaller` — which `GraphService.assemble` has already
 * deduped and stripped of self-edges.
 */
@Injectable()
export class BreadthService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Measures the direct fan-out of every named callable. */
  public measure(args: MeasureBreadthArguments): BreadthMeasurement {
    const byCallable = new Map<CallableId, CallableBreadth>();

    for (const callableId of args.callableIds) {
      const calleeIds = args.graph.calleeIdsByCaller.get(callableId) ?? [];

      byCallable.set(callableId, { breadth: calleeIds.length, calleeIds });
    }

    return { byCallable };
  }
}
