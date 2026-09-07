import { Injectable } from "@nestjs/common";

import { GatedLeafService } from "../gated-leaf/gated-leaf.js";

/**
 * A project that configures nothing, and is gated all the same.
 *
 * There is no `callidescope.config.ts` beside this file, so this project is
 * judged by whatever the run declares: `maximumDepth: 6`, written in
 * `callidescope.workspace.config.ts`. Seven frames breach it, and the finding
 * names six as the limit — the number this project inherited rather than chose.
 *
 * Four of those seven frames belong to `gated-leaf`, which is gated at three.
 * Counting them here does not judge them here: a stack is weighed against the
 * limit of the project its **root** belongs to, and this root is ours.
 */
@Injectable()
export class InheritedLimitsService {
  // 🏗 Dependency Injection

  constructor(private readonly gatedLeafService: GatedLeafService) {}

  // 🔏 Private Methods

  /** Hands the key to the leaf, which is where this project's code stops. */
  private forward(key: string): string {
    return this.gatedLeafService.read(key);
  }

  /** Prepares the key the leaf is asked about. */
  private prepare(key: string): string {
    return this.forward(key);
  }

  // 🌎 Public Methods

  /** Asks the leaf about one key, through the two frames above it. */
  public request(key: string): string {
    return this.prepare(key);
  }
}
