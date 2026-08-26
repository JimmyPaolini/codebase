import { Injectable } from "@nestjs/common";

import { ModuleSpreadService } from "../module-spread/module-spread.js";

/**
 * The near miss: transitive reach without direct breadth.
 *
 * Everything `ModuleSpreadService` reaches, this reaches too, so its transitive
 * spread clears the threshold on its own. It calls exactly one module directly,
 * which is why it is not reported — and why `directSpreadThreshold` exists.
 * Transitive reach alone would flag every entry point in a repository, because
 * an entry point legitimately reaches the whole program.
 */
@Injectable()
export class SpreadNearMissService {
  // 🏗 Dependency Injection

  constructor(private readonly moduleSpreadService: ModuleSpreadService) {}

  // 🌎 Public Methods

  /** Delegates the whole job to the one module it knows about. */
  public review(label: string): string {
    return this.moduleSpreadService.orchestrate(label);
  }
}
