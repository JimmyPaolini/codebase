import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  AnchorsService,
  DeliveryService,
  MARKDOWN_SECTION_INTRO_LINE,
  USAGE_MESSAGE,
} from "@codependix/cli";
import { Injectable } from "@nestjs/common";

import {
  EXPORT_TARGETS,
  SAMPLE_ANCHOR,
  SAMPLE_DIAGRAM,
  SAMPLE_JSON_PATH,
  SCRATCH_PREFIX,
} from "./export-delivery.constants";

import type {
  ExampleDocument,
  ExampleSection,
} from "../examples/examples.types";
import type { ScratchProject } from "./export-delivery.types";
import type { CodependixRunMode, ProjectRunResult } from "@codependix/cli";
import type { CodependixExportTarget } from "@codependix/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Delivers the same graph to every export target and reports what landed.
 *
 * `DeliveryService` is the one place a resolved export configuration becomes
 * file I/O, so every question about where an export goes is answered here:
 * which of the four targets writes which destination, what `--check` reports
 * that `--write` acts on, and why a run either fully succeeds or names exactly
 * which projects failed.
 *
 * Every example writes into a throwaway directory rather than into `output/`.
 * That keeps the committed example output to what a reader should read, and
 * keeps every anchor marker this package produces out of any file the real
 * `codebase:codependix:write` could claim.
 */
@Injectable()
/* v8 ignore stop */
export class ExportDeliveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly anchorsService: AnchorsService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the JSON-export example. */
  private buildJsonDocument(): ExampleDocument {
    return {
      id: "15-json-exports",
      jsonExports: [],
      sections: [
        {
          body: "| Graph | Committed as |\n| ----- | ------------ |\n| Nx Neighborhood | `output/json/codependix-neighborhood-graph.json` |\n| Nx Workspace Graph | `output/json/codependix-workspace-graph.json` |\n| NestJS module graph | `output/json/codependix-module-graph.json` |\n| TypeScript file imports | `output/json/codependix-imports-graph.json` |\n| Python file imports | `output/json/codependix-python-imports-graph.json` |",
          heading: "Every graph type's JSON shape, committed",
          note: "Each one is rendered by `DeliveryService.renderJson`, so it is byte-identical to what a real `codependix --write` would produce — two-space indentation and a trailing newline.",
        },
        {
          body: "`configuration/eslint.config.ts` turns `jsonc/sort-array-values` **off** for `**/codependix-*graph.json`. These arrays come out of the Nx project graph, a NestJS container, or a `ts.Program`, in whichever order each source discovers its projects, modules, or files — not alphabetical order. Enforcing a sort would rewrite what codependix just wrote, and every `codependix --write` would immediately fail its own `--check`. It is the same reformatting-versus-drift conflict `configuration/.oxfmtignore` already solves for `.conformetry/**`.",
          heading: "Why the sort rule is off for these files",
          note: "The committed exports here are named to match that glob, so the carve-out covers them too rather than being described from a distance.",
        },
      ],
      summary:
        "The JSON shape of every graph type, committed so a reader sees it without running anything — and why one ESLint rule is switched off for exactly these files.",
      title: "15. The JSON exports",
    };
  }

  /** Builds the `--check` versus `--write` example. */
  private buildModesDocument(): ExampleDocument {
    return {
      id: "13-check-and-write",
      jsonExports: [],
      sections: [
        {
          body: `\`\`\`json\n${JSON.stringify(this.deliverTwice(), null, 2)}\n\`\`\``,
          heading: "A current export, and the same export after it drifts",
          note: "The first result is what `--check` reports for an export nothing has moved. The second names the exact paths that went stale, which is what a reader is given to act on.",
        },
        {
          body: `\`\`\`text\n${USAGE_MESSAGE}\n\`\`\``,
          heading: "A command line naming neither mode",
          note: "`--check` and `--write` are mutually exclusive and one is required. A command line naming neither prints `USAGE_MESSAGE` and exits non-zero rather than silently defaulting to a write nobody asked for.",
        },
        {
          body: "```text\nOnly one of --check or --write may be given\n```",
          heading: "A command line naming both modes",
          note: "Rejected outright as well, and with a different reason — nothing selects a run mode when two are named.",
        },
        {
          body: "`CodependixService.run` attempts every project regardless of whether an earlier one failed, collecting each failure as a `ProjectRunFailure` rather than aborting the loop. `CodependixCommand.reportOutcome` then reports the failures and the stale exports together, and fails the run if either list is non-empty. That is the whole of the guarantee: `--write` either fully succeeds, or names exactly which projects failed while still completing every other one.",
          heading: "One project failing names itself and stops nothing",
          note: "Example 5 shows the same guarantee acting on three real containers, one of which refuses to load.",
        },
      ],
      summary:
        "What `--check` reports, what `--write` acts on, and the two command lines codependix refuses outright.",
      title: "13. `--check` versus `--write`",
    };
  }

  /** Delivers the sample graph at one target and lists what landed. */
  private deliverAtTarget(target: CodependixExportTarget): string[] {
    const project = this.createScratchProject();
    const before = this.snapshot(project);

    this.deliveryService.deliverGraphOutput({
      jsonContent: this.deliveryService.renderJson({ target }),
      markdownContent: SAMPLE_DIAGRAM,
      markdownSection: {
        introLine: MARKDOWN_SECTION_INTRO_LINE,
        subheading: "Nx Neighborhood",
      },
      mode: "write",
      project,
      resolvedOutput: {
        json: { path: SAMPLE_JSON_PATH },
        markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
        target,
      },
    });

    return this.listChangedPaths(project, before);
  }

  /** Delivers the sample graph, then delivers a different one over it. */
  private deliverTwice(): ProjectRunResult[] {
    const project = this.createScratchProject();

    this.deliver({ content: SAMPLE_DIAGRAM, mode: "write", project });

    return [
      this.deliver({ content: SAMPLE_DIAGRAM, mode: "check", project }),
      this.deliver({
        content: SAMPLE_DIAGRAM.replace("atlas_core", "atlas_kernel"),
        mode: "check",
        project,
      }),
    ];
  }

  /**
   * Lists the files a delivery created or changed, project-relative.
   *
   * Compared against a snapshot taken before the delivery rather than simply
   * listed: every scratch project is seeded with a `README.md` already carrying
   * the anchor, so a bare listing would report that file for a `none` target
   * that wrote nothing at all.
   */
  private listChangedPaths(
    project: ScratchProject,
    before: Map<string, string>,
  ): string[] {
    return [...this.snapshot(project)]
      .filter(([relativePath, content]) => before.get(relativePath) !== content)
      .map(([relativePath]) => relativePath)
      .toSorted((first, second) => first.localeCompare(second));
  }

  /** Records every file a scratch project holds, keyed by relative path. */
  private snapshot(project: ScratchProject): Map<string, string> {
    const entries = readdirSync(project.absoluteRoot, { recursive: true })
      .map(String)
      .filter((entry) => path.extname(entry).length > 0);

    return new Map(
      entries.map((relativePath) => [
        relativePath,
        readFileSync(path.join(project.absoluteRoot, relativePath), "utf8"),
      ]),
    );
  }

  // 🌎 Public Methods

  /** Builds every delivery example document. */
  build(): ExampleDocument[] {
    return [
      this.buildTargetsDocument(),
      this.buildModesDocument(),
      this.buildJsonDocument(),
    ];
  }

  /** Builds the export-target example. */
  buildTargetsDocument(): ExampleDocument {
    return {
      id: "10-export-targets",
      jsonExports: [],
      sections: [
        ...this.buildTargetSections(),
        {
          body: `\`\`\`text\n${this.deliverUnwrittenJson().join("\n")}\n\`\`\``,
          heading: "A configured destination the target leaves unwritten",
          note: "The `json` destination is configured and the target is `markdown`, so nothing is written to it. This is why `both` is a named target rather than something inferred from which destinations are present: a project can keep a destination in place without writing it yet.",
        },
      ],
      summary:
        "The same graph delivered at each of the four export targets, and the property that explains why `both` is named rather than inferred.",
      title: "10. All four export targets",
    };
  }

  /** Builds one section per export target. */
  buildTargetSections(): ExampleSection[] {
    return EXPORT_TARGETS.map((target) => {
      const written = this.deliverAtTarget(target);

      return {
        body: `\`\`\`text\n${written.length === 0 ? "(nothing written)" : written.join("\n")}\n\`\`\``,
        heading: `\`target: "${target}"\``,
        note: `Files created or changed, against a scratch project that already held a \`README.md\` carrying the \`${SAMPLE_ANCHOR}\` anchor.`,
      };
    });
  }

  /** Creates a throwaway project directory holding a seeded `README.md`. */
  createScratchProject(seed?: string): ScratchProject {
    const absoluteRoot = mkdtempSync(path.join(tmpdir(), SCRATCH_PREFIX));

    writeFileSync(
      path.join(absoluteRoot, "README.md"),
      seed ?? this.seedReadme(),
      "utf8",
    );

    return { absoluteRoot, name: "atlas-service" };
  }

  /** Delivers one Markdown export into a scratch project. */
  deliver(args: {
    content: string;
    mode: CodependixRunMode;
    project: ScratchProject;
  }): ProjectRunResult {
    return this.deliveryService.deliverGraphOutput({
      jsonContent: undefined,
      markdownContent: args.content,
      markdownSection: {
        introLine: MARKDOWN_SECTION_INTRO_LINE,
        subheading: "Nx Neighborhood",
      },
      mode: args.mode,
      project: args.project,
      resolvedOutput: {
        json: undefined,
        markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
        target: "markdown",
      },
    });
  }

  /** Delivers with a JSON destination configured and a Markdown-only target. */
  deliverUnwrittenJson(): string[] {
    const project = this.createScratchProject();
    const before = this.snapshot(project);

    this.deliveryService.deliverGraphOutput({
      jsonContent: this.deliveryService.renderJson({ unwritten: true }),
      markdownContent: SAMPLE_DIAGRAM,
      markdownSection: {
        introLine: MARKDOWN_SECTION_INTRO_LINE,
        subheading: "Nx Neighborhood",
      },
      mode: "write",
      project,
      resolvedOutput: {
        json: { path: SAMPLE_JSON_PATH },
        markdown: { anchor: SAMPLE_ANCHOR, path: "README.md" },
        target: "markdown",
      },
    });

    return this.listChangedPaths(project, before);
  }

  /** Reads a scratch project's `README.md` back. */
  readReadme(project: ScratchProject): string {
    return readFileSync(path.join(project.absoluteRoot, "README.md"), "utf8");
  }

  /** Builds the `README.md` every scratch project starts from. */
  seedReadme(): string {
    return [
      "# Atlas Service",
      "",
      "A fixture project.",
      "",
      "## 🕸️ Codependix",
      "",
      MARKDOWN_SECTION_INTRO_LINE,
      "",
      "### Nx Neighborhood",
      "",
      this.anchorsService.wrapInAnchors(SAMPLE_ANCHOR, "_Not yet exported._"),
      "",
    ].join("\n");
  }
}
