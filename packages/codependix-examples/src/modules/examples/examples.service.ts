import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { AnchorPlacementService } from "../anchor-placement/anchor-placement.service";
import { ConfigurationResolutionService } from "../configuration-resolution/configuration-resolution.service";
import { ExportDeliveryService } from "../export-delivery/export-delivery.service";
import { GraphLevelsService } from "../graph-levels/graph-levels.service";
import { NestjsGraphsService } from "../nestjs-graphs/nestjs-graphs.service";
import { NxGraphsService } from "../nx-graphs/nx-graphs.service";
import { PythonImportsService } from "../python-imports/python-imports.service";
import { TypescriptImportsService } from "../typescript-imports/typescript-imports.service";

import { EXAMPLES_JSON_DIRECTORY } from "./examples.constants";

import type {
  ExampleDocument,
  ExampleFile,
  ExampleRunMode,
  ExampleRunOutcome,
} from "./examples.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Renders every worked example and keeps the committed output honest.
 *
 * The group services each own one part of codependix's behavior and hand back
 * `ExampleDocument`s; this service is the only place that knows they exist
 * together, renders them to Markdown, and either writes them or reports which
 * ones drifted. Splitting it that way is the same shape `codependix-cli` uses,
 * where `CodependixService` orchestrates four graph builders that know nothing
 * about each other.
 *
 * `check` is what makes the guides trustworthy. Every claim the README and
 * `AGENTS.md` make is quoted from a file this service rendered, so a resolver
 * or scanner change that silently reversed one of them fails here rather than
 * leaving a guide describing behavior the tool no longer has.
 */
@Injectable()
/* v8 ignore stop */
export class ExamplesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly anchorPlacementService: AnchorPlacementService,
    private readonly configurationResolutionService: ConfigurationResolutionService,
    private readonly exportDeliveryService: ExportDeliveryService,
    private readonly graphLevelsService: GraphLevelsService,
    private readonly nestjsGraphsService: NestjsGraphsService,
    private readonly nxGraphsService: NxGraphsService,
    private readonly pythonImportsService: PythonImportsService,
    private readonly typescriptImportsService: TypescriptImportsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Writes a file, or reports whether what is on disk already matches. */
  private deliverFile(args: {
    absolutePath: string;
    content: string;
    mode: ExampleRunMode;
  }): boolean {
    if (args.mode === "check") {
      return this.readFileOrEmpty(args.absolutePath) === args.content;
    }

    mkdirSync(path.dirname(args.absolutePath), { recursive: true });
    writeFileSync(args.absolutePath, args.content, "utf8");

    return true;
  }

  /** Reads a file's content, or an empty string when it does not exist yet. */
  private readFileOrEmpty(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /** Collects every example document, in the order the guides read them. */
  async collect(): Promise<ExampleDocument[]> {
    return [
      ...(await this.graphLevelsService.build()),
      ...this.nxGraphsService.build(),
      ...(await this.nestjsGraphsService.build()),
      ...this.typescriptImportsService.build(),
      ...this.pythonImportsService.build(),
      ...(await this.configurationResolutionService.build()),
      ...this.exportDeliveryService.build(),
      ...this.anchorPlacementService.build(),
    ].toSorted((first, second) => first.id.localeCompare(second.id));
  }

  /**
   * Renders one document as Markdown.
   *
   * Shaped so `markdownlint` passes on the result without a fix pass: one
   * top-level heading, a blank line either side of every heading and every
   * fenced block, and exactly one trailing newline.
   */
  renderDocument(document: ExampleDocument): string {
    const lines = [`# ${document.title}`, "", document.summary];

    for (const section of document.sections) {
      lines.push(
        "",
        `## ${section.heading}`,
        "",
        section.note,
        "",
        section.body,
      );
    }

    return `${lines.join("\n").trimEnd()}\n`;
  }

  /** Lists every file one document is committed as, Markdown first. */
  resolveFiles(document: ExampleDocument): ExampleFile[] {
    return [
      {
        content: this.renderDocument(document),
        relativePath: `${document.id}.md`,
      },
      ...document.jsonExports.map((jsonExport) => ({
        content: jsonExport.content,
        relativePath: path.join(EXAMPLES_JSON_DIRECTORY, jsonExport.fileName),
      })),
    ];
  }

  /** Renders every example, writing it or reporting what drifted. */
  async run(
    mode: ExampleRunMode,
    outputDirectory: string,
  ): Promise<ExampleRunOutcome> {
    const documents = await this.collect();
    const stalePaths: string[] = [];
    let writtenCount = 0;

    for (const document of documents) {
      for (const file of this.resolveFiles(document)) {
        const isCurrent = this.deliverFile({
          absolutePath: path.resolve(outputDirectory, file.relativePath),
          content: file.content,
          mode,
        });

        writtenCount += 1;
        if (!isCurrent) stalePaths.push(file.relativePath);
      }
    }

    return { stalePaths, writtenCount };
  }
}
