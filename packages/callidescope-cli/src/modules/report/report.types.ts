// 🏷️ Types

import type { CallStack, ProjectReport } from "@callidescope/configuration";

/** Arguments for rendering one project's section. */
export interface RenderProjectSectionArguments {
  readonly heading: string;
  readonly previewCount: number;
  readonly report: ProjectReport;
}

/** Arguments for rendering a run's stacks, preview then disclosure. */
export interface RenderStacksArguments {
  readonly previewCount: number;
  readonly stacks: readonly CallStack[];
}
