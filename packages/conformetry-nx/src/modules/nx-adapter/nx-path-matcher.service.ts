import { Injectable } from "@nestjs/common";

import type { PathMatcher } from "./nx-adapter.types.js";

/**
 * Implements a minimal path matcher for Nx-backed generation.
 */
@Injectable()
export class NxPathMatcher implements PathMatcher {
  /**
   * Matches a path name against a simple glob pattern.
   */
  public match(pathName: string, pattern: string): boolean {
    const escapedPattern = pattern
      .replaceAll(".", String.raw`\.`)
      .replaceAll("*", "[^/]*")
      .replaceAll("/", String.raw`\/`);

    return new RegExp(`^${escapedPattern}$`, "u").test(pathName);
  }
}
