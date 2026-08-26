// ♟️ Constants

import { buildExampleAnchor } from "../examples/examples.constants";

import type { AnchorPlacementCase } from "./anchor-placement.types";

/** Anchor the Nx Neighborhood block in every anchors example carries. */
export const NX_ANCHOR = buildExampleAnchor("nx");

/** A second anchor in the same file, proving two named blocks never collide. */
export const NESTJS_ANCHOR = buildExampleAnchor("nestjs");

/** Anchor the workspace-level example uses, which carries no subheading. */
export const WORKSPACE_ANCHOR = buildExampleAnchor("workspace");

/** The diagram every anchors example splices, so only the placement varies. */
export const SAMPLE_DIAGRAM = [
  "```mermaid",
  "graph LR",
  '  atlas_core["atlas-core"]',
  '  atlas_service["atlas-service"]',
  "  atlas_service --> atlas_core",
  "```",
].join("\n");

/** A file that carries no `## 🕸️ Codependix` section at all. */
export const PLAIN_README = [
  "# Atlas Service",
  "",
  "A fixture project.",
  "",
].join("\n");

/** A file whose `## 🕸️ Codependix` heading a human wrote by hand. */
export const HAND_WRITTEN_SECTION_README = [
  "# Atlas Service",
  "",
  "A fixture project.",
  "",
  "## 🕸️ Codependix",
  "",
  "A heading a person placed here, with this exact text.",
  "",
  "## License",
  "",
  "MIT.",
  "",
].join("\n");

/** Subheading the Nx Neighborhood's anchor is placed under. */
export const NX_SUBHEADING = "Nx Neighborhood";

/** Subheading the NestJS module graph's anchor is placed under. */
export const NESTJS_SUBHEADING = "NestJS Module Graph";

/** Every branch of the auto-creation rule, in the order the example walks them. */
export const AUTO_CREATION_CASES: AnchorPlacementCase[] = [
  {
    anchorName: NX_ANCHOR,
    fileContent: PLAIN_README,
    heading: "A file with no such section",
    note: "The heading, the intro line, the `### <subheading>`, and the anchor block are appended to the end of the file. Nothing above them is touched.",
    previousPlacements: [],
    subheading: NX_SUBHEADING,
  },
  {
    anchorName: NESTJS_ANCHOR,
    fileContent: PLAIN_README,
    heading: "A second graph type, under a section that already exists",
    note: "The heading is not duplicated: the new `### <subheading>` and its anchor go at the end of the existing section. Two named anchors in one file never collide, which is the reason anchors are named at all.",
    previousPlacements: [{ anchorName: NX_ANCHOR, subheading: NX_SUBHEADING }],
    subheading: NESTJS_SUBHEADING,
  },
  {
    anchorName: NX_ANCHOR,
    fileContent: HAND_WRITTEN_SECTION_README,
    heading: "A heading a human wrote by hand",
    note: "`CODEPENDIX_SECTION_HEADING` is matched literally against a whole line, so a heading a person placed with that exact text is reused rather than duplicated — and the `## License` section after it stays where it was.",
    previousPlacements: [],
    subheading: NX_SUBHEADING,
  },
  {
    anchorName: WORKSPACE_ANCHOR,
    fileContent: PLAIN_README,
    heading: "The workspace README, which has no subheading",
    note: "The Workspace Graph's anchor sits directly under the heading: the root README carries no other graph type's section to disambiguate from.",
    previousPlacements: [],
    subheading: undefined,
  },
];
