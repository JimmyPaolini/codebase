import path from "node:path";

import { DEFAULT_PREVIEW_COUNT } from "@callidescope/configuration";
import {
  MarkdownReportService,
  OutputJsonService,
  OutputMarkdownService,
} from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import { PROJECT_README_NAME } from "./write-destinations.constants";

import type {
  BuildProjectSectionsArguments,
  SyncDestinationsArguments,
  SyncProjectSectionsArguments,
} from "./write-destinations.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";
import type { ProjectSection } from "@callidescope/output";

/**
 * Writes a finished run to every destination it was configured with.
 *
 * Its own service rather than more of the command, because the two answer
 * different questions: the command decides whether a run may write at all, and
 * this decides where what it found lands. There are now two answers to that
 * second question — the workspace's own declarations and each project's — and
 * keeping them side by side is what stops one writing over the other.
 */
@Injectable()
export class WriteDestinationsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly markdownReportService: MarkdownReportService,
    private readonly outputJsonService: OutputJsonService,
    private readonly outputMarkdownService: OutputMarkdownService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds one section per scoped project, addressed to that project's README.
   *
   * The map holds the projects the run was scoped to, so a project it only
   * measured through the dependency closure has no root here and is dropped.
   * That is the rule rather than an accident: a scoped run publishes its own
   * projects, and leaves its dependencies' READMEs to the run that is scoped
   * to them.
   *
   * A project that declared destinations of its own is dropped for a second
   * reason: it has already been published to them, and the fan-out is what it
   * was speaking instead of.
   */
  private buildProjectSections(
    args: BuildProjectSectionsArguments,
  ): ProjectSection[] {
    return args.result.projects.flatMap((report) => {
      const root = args.startingProjectRoots.get(report.projectName);

      return root === undefined || args.writeByProject.has(report.projectName)
        ? []
        : [
            {
              content: this.markdownReportService.renderProjectSection({
                heading: args.destination.heading,
                limits: args.limits,
                previewCount: args.destination.previewCount,
                rendering: "tree",
                report,
              }),
              path: path.join(root, PROJECT_README_NAME),
            },
          ];
    });
  }

  /**
   * Writes the destinations each project declared for itself, returning the
   * stale ones.
   *
   * A path is read relative to that project's own root, which is what keeps a
   * project's declaration about its own documents rather than about the
   * repository's — a project cannot write into a sibling by declaring one.
   *
   * Only the projects a run was scoped to are published, exactly as the
   * fan-out is: a dependency measured through the closure has its own run to
   * publish it, and this one was never pointed at it.
   */
  private syncProjectDestinations(args: SyncDestinationsArguments): string[] {
    const stale: string[] = [];

    for (const report of args.result.projects) {
      const root = args.startingProjectRoots.get(report.projectName);
      const write = args.writeByProject.get(report.projectName);

      if (root === undefined || write === undefined) {
        continue;
      }

      stale.push(
        ...this.syncProjectSections({
          check: args.check,
          configuration: args.configuration,
          projectLimits: args.projectLimits,
          report,
          result: args.result,
          root,
          write,
        }),
      );
    }

    return stale;
  }

  /** Writes one project's declared destinations, returning the stale ones. */
  private syncProjectSections(args: SyncProjectSectionsArguments): string[] {
    const stale: string[] = [];

    // The two destinations carry the same section, drawn in one and printed in
    // the other — the same split the run's own two make.
    for (const [destination, rendering] of [
      [args.write.markdown, "tree"],
      [args.write.mermaid, "diagram"],
    ] as const) {
      if (destination === undefined) {
        continue;
      }

      const resolved = {
        ...destination,
        path: path.join(args.root, destination.path),
      };

      if (
        !this.outputMarkdownService.sync({
          check: args.check,
          content: this.markdownReportService.renderProjectSection({
            heading: destination.heading,
            limits: args.projectLimits,
            previewCount: this.readPreviewCount(args.configuration),
            rendering,
            report: args.report,
          }),
          destination: resolved,
          result: args.result,
        })
      ) {
        stale.push(resolved.path);
      }
    }

    return stale;
  }

  // 🌎 Public Methods

  /** How many stacks a section shows before the rest are folded away. */
  public readPreviewCount(
    configuration: ResolvedCallidescopeConfiguration,
  ): number {
    return (
      configuration.write.projectReadmes?.previewCount ?? DEFAULT_PREVIEW_COUNT
    );
  }

  /** Writes every configured destination, returning the stale ones. */
  public syncDestinations(args: SyncDestinationsArguments): string[] {
    const stale: string[] = [];
    const { json, markdown, mermaid, projectReadmes } =
      args.configuration.write;

    if (
      json !== undefined &&
      !this.outputJsonService.sync({
        check: args.check,
        destination: json,
        result: args.result,
      })
    ) {
      stale.push(json.path);
    }

    // Both anchored destinations write the same report; they differ only in
    // whether its stacks are printed or drawn.
    for (const [destination, rendering] of [
      [markdown, "tree"],
      [mermaid, "diagram"],
    ] as const) {
      if (
        destination !== undefined &&
        !this.outputMarkdownService.sync({
          check: args.check,
          content: this.markdownReportService.renderRun({
            description: destination.description,
            heading: destination.heading,
            limits: args.projectLimits,
            previewCount: this.readPreviewCount(args.configuration),
            rendering,
            result: args.result,
          }),
          destination,
          result: args.result,
        })
      ) {
        stale.push(destination.path);
      }
    }

    stale.push(...this.syncProjectDestinations(args));

    if (projectReadmes !== undefined) {
      stale.push(
        ...this.outputMarkdownService.syncProjectReadmes({
          check: args.check,
          destination: projectReadmes,
          sections: this.buildProjectSections({
            destination: projectReadmes,
            limits: args.projectLimits,
            result: args.result,
            startingProjectRoots: args.startingProjectRoots,
            writeByProject: args.writeByProject,
          }),
        }),
      );
    }

    return stale;
  }
}
