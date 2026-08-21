// 🏷️ Types

import type { ResolvedCodometerTarget } from "@codometer/configuration";

/** Arguments accepted when listing the files a target holds. */
export interface MatchTargetFilesArguments {
  target: ResolvedCodometerTarget;
  workingDirectory: string;
}

/** What a directory entry counts as while a target's tree is walked. */
export type TargetEntryKind = "directory" | "file" | "other";

/** Arguments accepted when walking one directory of a target's tree. */
export interface WalkTargetArguments {
  absoluteDirectory: string;
  /**
   * The literal path prefix of each include glob.
   *
   * A glob's prefix is where its matches can begin, so a directory neither
   * leading to a prefix nor sitting inside one holds nothing the target wants.
   */
  includeBases: readonly string[];
  relativeDirectory: string;
  target: ResolvedCodometerTarget;
}
