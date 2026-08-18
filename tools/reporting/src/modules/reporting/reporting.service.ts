import { readFile, writeFile } from "node:fs/promises";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { ReportingMarkersService } from "./reporting-markers.service";

import type {
  ReportableCommand,
  ReportDestination,
  ReportOptions,
} from "./reporting.types";

/**
 * Renders a report and puts it where it was asked for.
 *
 * Every report shares this: wrap the body in its markers, then write it to a
 * file, splice it into a document, or print it. Nothing here knows what any
 * report measures, and nothing here talks to a forge — handing the markdown to
 * a pull request, an issue, or a wiki is the caller's job.
 */
@Injectable()
export class ReportingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly markersService: ReportingMarkersService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ReportingService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a document, treating an absent one as empty. */
  private async readDocument(documentPath: string): Promise<string> {
    try {
      const existing = await readFile(documentPath, "utf8");
      return existing.trimEnd();
    } catch {
      return "";
    }
  }

  /**
   * Renders one report and writes it wherever the destination says.
   *
   * With neither a file nor a document the section goes to standard output,
   * which is what makes any report inspectable before it is wired into
   * anything.
   */
  async emit(
    command: ReportableCommand,
    options: ReportOptions,
    destination: ReportDestination,
  ): Promise<void> {
    const body = await command.renderReport(options);
    const section = this.markersService.wrap(body, command.reportMarkers);

    if (destination.output !== undefined) {
      await writeFile(destination.output, `${section}\n`, "utf8");
      this.logger.log(
        `📝 Wrote the ${command.reportLabel} report to ${destination.output}`,
      );
    }

    if (destination.markdown !== undefined) {
      const document = await this.readDocument(destination.markdown);
      const spliced = this.markersService.splice(
        document,
        section,
        command.reportMarkers,
      );
      await writeFile(destination.markdown, `${spliced}\n`, "utf8");
      this.logger.log(
        `📝 Spliced the ${command.reportLabel} report into ${destination.markdown}`,
      );
    }

    if (
      destination.output === undefined &&
      destination.markdown === undefined
    ) {
      process.stdout.write(`${section}\n`);
    }
  }

  // 🌎 Public Methods

  /**
   * Narrows an option that carries text, or nothing at all.
   *
   * A flag written `--baseline-url "$EMPTY"` can reach commander with no value
   * at all, which it reports as `true` without calling the option's parser. So
   * anything but a non-empty string counts as absent — passing that boolean
   * through renders a link to the word `true`.
   */
  readOptionalText(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
  }
}
