import { rmSync } from "node:fs";
import path from "node:path";

import { AnchorsService, MARKDOWN_SECTION_INTRO_LINE } from "@codependix/cli";
import { Injectable } from "@nestjs/common";

import { ExportDeliveryService } from "../export-delivery/export-delivery.service";

import {
  AUTO_CREATION_CASES,
  PLAIN_README,
  SAMPLE_DIAGRAM,
} from "./anchor-placement.constants";

import type {
  ExampleDocument,
  ExampleSection,
} from "../examples/examples.types";
import type { AnchorPlacementCase } from "./anchor-placement.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Splices Markdown exports into anchor blocks and shows exactly what lands.
 *
 * Markdown used to be opt-in, because a missing anchor was an error: placing a
 * Markdown export was something a human did once, by hand, rather than
 * codependix guessing where in a document it belonged. That could not scale to
 * every project in a workspace nobody had hand-placed anchors in, so
 * `DeliveryService` now auto-creates a missing `## 🕸️ Codependix` section on
 * `--write`.
 *
 * The risk that change takes on is bounded to two safe, well-defined spots —
 * the end of the file, or the end of an existing `## 🕸️ Codependix` section —
 * and never anywhere else in a document somebody else is authoring. Every
 * branch of that is rendered here rather than described, because the claim is
 * about the exact bytes written into a file the tool does not own.
 */
@Injectable()
/* v8 ignore stop */
export class AnchorPlacementService {
  // 🏗 Dependency Injection

  constructor(
    private readonly anchorsService: AnchorsService,
    private readonly exportDeliveryService: ExportDeliveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the auto-created-section example. */
  private buildAutoCreationDocument(): ExampleDocument {
    return {
      id: "12-auto-created-sections",
      jsonExports: [],
      sections: [
        ...this.buildAutoCreationSections(),
        ...this.buildMissingReadmeSections(),
      ],
      summary:
        "A missing anchor used to be an error. It is now auto-created on `--write` — at the end of the file, or at the end of an existing section, and nowhere else.",
      title: "12. Auto-creating the `## 🕸️ Codependix` section",
    };
  }

  /** Builds the four branches of the auto-creation rule. */
  private buildAutoCreationSections(): ExampleSection[] {
    return AUTO_CREATION_CASES.map((placementCase) => ({
      body: this.renderMarkdown(this.applyCase(placementCase)),
      heading: placementCase.heading,
      note: placementCase.note,
    }));
  }

  /** Builds the two sections covering a project with no `README.md` at all. */
  private buildMissingReadmeSections(): ExampleSection[] {
    return [
      {
        body: `\`\`\`text\n${this.describeMissingReadme("write")}\n\`\`\``,
        heading: "A project with no `README.md`, on `--write`",
        note: "Fails outright, in either mode. The file itself not existing is a more serious problem than a missing anchor — there is nothing to splice into and nothing safe to create.",
      },
      {
        body: `\`\`\`text\n${this.describeMissingAnchor()}\n\`\`\``,
        heading: "A `README.md` with no anchor, on `--check`",
        note: "Reported as stale rather than raising, consistent with every other kind of drift this tool reports. A project that has never had codependix output simply shows up as needing a write.",
      },
    ];
  }

  /** Builds the two-Markdown-modes example. */
  private buildModesDocument(): ExampleDocument {
    const project = this.exportDeliveryService.createScratchProject();

    this.exportDeliveryService.deliver({
      content: SAMPLE_DIAGRAM,
      mode: "write",
      project,
    });

    return {
      id: "11-markdown-modes",
      jsonExports: [],
      sections: [
        {
          body: this.renderMarkdown(
            this.exportDeliveryService.readReadme(project),
          ),
          heading: "Anchored: spliced into a named block in an existing file",
          note: "Naming an `anchor` places the export inside that block in the file at `path`, which defaults to `README.md` — the rest of the document is left exactly as it was.",
        },
        {
          body: this.renderMarkdown(`${SAMPLE_DIAGRAM}\n`),
          heading: "Standalone: the whole contents of its own file",
          note: "Leaving `anchor` unset writes the export as the entire file. `path` must then be given explicitly, since there is no default worth guessing for a file codependix is creating outright.",
        },
        {
          body: '```ts\nmarkdown: { anchor: "codependix-nx" }                       // → README.md\nmarkdown: { anchor: "codependix-nx", path: "docs/graphs.md" } // → docs/graphs.md\nmarkdown: { path: "docs/atlas-service-graph.md" }            // → a standalone file\nmarkdown: {}                                                 // → refused\n```',
          heading: "The four shapes a Markdown destination can take",
          note: "The last one names nowhere for the export to go, and is refused by the schema — see example 14.",
        },
      ],
      summary:
        "An anchored splice into a named block inside a file somebody else is authoring, and a standalone file whose entire contents are the export.",
      title: "11. Both Markdown modes",
    };
  }

  /** Reports what `--check` says about a `README.md` that carries no anchor. */
  private describeMissingAnchor(): string {
    const project =
      this.exportDeliveryService.createScratchProject(PLAIN_README);
    const result = this.exportDeliveryService.deliver({
      content: SAMPLE_DIAGRAM,
      mode: "check",
      project,
    });

    return `isCurrent: ${String(result.isCurrent)}\nstalePaths: ${result.stalePaths.join(", ")}`;
  }

  /** Reports what happens when the file a destination names does not exist. */
  private describeMissingReadme(mode: "check" | "write"): string {
    const project = this.exportDeliveryService.createScratchProject();

    rmSync(path.join(project.absoluteRoot, "README.md"));

    try {
      this.exportDeliveryService.deliver({
        content: SAMPLE_DIAGRAM,
        mode,
        project,
      });

      /* v8 ignore next -- a destination with no file always raises */
      return "delivered";
    } catch (error) {
      return this.redactRoot(this.describeError(error), project.absoluteRoot);
    }
  }

  /**
   * Wraps rendered Markdown in a fence so the document shows it verbatim.
   *
   * Fenced with four backticks rather than three: the content being shown is a
   * spliced export, which contains a fenced mermaid diagram of its own, and a
   * three-backtick fence would close on it.
   */
  private renderMarkdown(content: string): string {
    return `\`\`\`\`markdown\n${content.trimEnd()}\n\`\`\`\``;
  }

  // 🌎 Public Methods

  /** Applies a case's earlier placements, then the placement it demonstrates. */
  applyCase(placementCase: AnchorPlacementCase): string {
    const seeded = placementCase.previousPlacements.reduce(
      (fileContent, placement) =>
        this.insert({
          anchorName: placement.anchorName,
          fileContent,
          subheading: placement.subheading,
        }),
      placementCase.fileContent,
    );

    return this.insert({
      anchorName: placementCase.anchorName,
      fileContent: seeded,
      subheading: placementCase.subheading,
    });
  }

  /** Builds every anchor-placement example document. */
  build(): ExampleDocument[] {
    return [this.buildModesDocument(), this.buildAutoCreationDocument()];
  }

  /** Describes a raised value, whether or not it was an `Error`. */
  describeError(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  }

  /** Auto-creates one anchor's section in a file that does not carry it. */
  insert(args: {
    anchorName: string;
    fileContent: string;
    subheading: string | undefined;
  }): string {
    return this.anchorsService.insertAnchorSection({
      anchorName: args.anchorName,
      content: SAMPLE_DIAGRAM,
      fileContent: args.fileContent,
      introLine: MARKDOWN_SECTION_INTRO_LINE,
      subheading: args.subheading,
    });
  }

  /**
   * Replaces a throwaway directory with a stable placeholder.
   *
   * A committed example carrying the temporary path of whichever machine
   * rendered it would fail `examples --check` everywhere else.
   */
  redactRoot(message: string, absoluteRoot: string): string {
    return message.replaceAll(absoluteRoot, "<project>");
  }
}
