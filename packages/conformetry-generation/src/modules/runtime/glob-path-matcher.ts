import type { PathMatcher } from "./runtime.types.js";

/**
 * Matches paths against a minimal glob pattern syntax.
 */
export class GlobPathMatcher implements PathMatcher {
  /**
   * Returns true when the path matches the glob pattern.
   */
  public match(pathName: string, pattern: string): boolean {
    const normalizedPattern = pattern.replaceAll("*", "[^/]*");
    const escapedPattern = normalizedPattern.replaceAll(
      /[.+^${}()|[\]\\]/gu,
      String.raw`\$&`,
    );
    return new RegExp(`^${escapedPattern}$`, "u").test(pathName);
  }
}
