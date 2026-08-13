// 🏷️ Types

import type { MatchedInstance } from "@jimmypaolini/conformetry-configuration";

/** Arguments for checking matched instances against the templates they matched. */
export interface CheckInstanceFilesArguments {
  readonly instances: MatchedInstance[];
}
