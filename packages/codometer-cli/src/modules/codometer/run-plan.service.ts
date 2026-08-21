import { existsSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  REPOSITORY_ROOT_MARKERS,
} from "@codometer/configuration";
import { Injectable } from "@nestjs/common";

import {
  CHECK_LIMITS,
  CHECK_NAMES,
  CHECK_REPORTS,
  CHECK_SEPARATOR,
} from "./run-plan.constants";

import type { MeasurementScope } from "../output-markdown/output-markdown.types";
import type { CodometerCommandOptions } from "./codometer.types";
import type {
  JsonDestination,
  ListOutputPathsArguments,
  MarkdownDocumentDestination,
  ModeSelection,
  ResolveDestinationsArguments,
  RunDestinations,
  RunMode,
} from "./run-plan.types";
import type { ResolvedCodometerMarkdownOutputConfiguration } from "@codometer/configuration";

/**
 * Reads a command line into what the run will do and where its output goes.
 *
 * Kept away from the command itself so that the flag semantics can be stated
 * once and tested without a measurement: which flag writes, which flag fails,
 * and which file each output lands in are three separate questions, and every
 * one of them has been got wrong by inferring it from another.
 */
@Injectable()
export class RunPlanService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** States what `--check` accepts, in front of whatever went wrong. */
  private describeAcceptedCheckNames(problem: string): string {
    return `${problem}. It takes a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--check ${CHECK_NAMES.join(CHECK_SEPARATOR)}".`;
  }

  /**
   * Whether the command line named a destination of its own.
   *
   * A command line that names one names them *all*: `--json` on its own asks
   * for the report and nothing else, whatever the configuration file also
   * describes. Adding to the configured set instead would put a second
   * document on the stream the first one was piped out of.
   */
  private namesDestination(options: CodometerCommandOptions): boolean {
    return (
      options.json !== undefined ||
      options.markdown !== undefined ||
      options.readme !== undefined
    );
  }

  /**
   * Reads the `--check` value into the set of things the run fails on.
   *
   * A flag passed without a value arrives as `true` and is a mistake rather
   * than a shorthand: it used to mean "check everything", and a set with
   * nothing in it looks exactly like the flag having been left off.
   */
  private readCheckNames(
    value: string | true | undefined,
    errors: string[],
  ): Set<string> {
    if (value === undefined) {
      return new Set();
    }

    if (value === true) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    const names = value
      .split(CHECK_SEPARATOR)
      .map((name) => name.trim())
      .filter((name) => name !== "");

    // An empty or comma-only value is the same mistake as a valueless flag and
    // is refused the same way. Read as "gate nothing" it would be a gate that
    // cannot fail — `--check "$GATES"` with the variable unset would pass
    // forever against a stale report, which is worse than no gate at all
    // because it looks like protection.
    if (names.length === 0) {
      errors.push(this.describeAcceptedCheckNames("--check needs a value"));
      return new Set();
    }

    return this.validateCheckNames(names, errors);
  }

  /**
   * Reads an optional-value path flag.
   *
   * `true` is the flag passed without a path, which asks for the console. It
   * outranks a configured path: naming the flag is how a run says it wants
   * this output somewhere other than where the configuration file put it.
   */
  private readPathFlag(
    flag: string | true | undefined,
    configured: string | undefined,
  ): string | undefined {
    if (flag === undefined) {
      return configured;
    }

    return flag === true ? undefined : flag;
  }

  /**
   * Refuses a report path no mode of this run would ever put a report at.
   *
   * `--json <path>` asks for a file, and only a run that writes or compares
   * one produces it. Without either, the report goes to the console and the
   * file stays unwritten — and because the run exits clean, the first thing to
   * notice used to be the pull request's bundle section, rendering as though
   * the project had changed nothing. Refused here instead, before anything is
   * measured, naming the flag that has to be added.
   *
   * A pathless `--json` is untouched. The console is what it asked for, not a
   * file that failed to appear.
   */
  private requireWrittenReport(
    options: CodometerCommandOptions,
    mode: RunMode,
    errors: string[],
  ): void {
    if (typeof options.json !== "string") {
      return;
    }

    if (mode.writes || mode.checksReports) {
      return;
    }

    errors.push(
      `--json ${options.json} needs --write or --check ${CHECK_REPORTS}: a run that neither writes the report nor compares it would render it to the console and leave that file unwritten. Add --write to write it, --check ${CHECK_REPORTS} to fail on a stale one, or drop the path to ask for the console.`,
    );
  }

  /** Where the report goes, if anywhere. */
  private resolveJson(
    args: ResolveDestinationsArguments,
    named: boolean,
  ): JsonDestination | undefined {
    if (named && args.options.json === undefined) {
      return undefined;
    }

    const configured = args.configuration.output.json;

    if (args.options.json === undefined && configured === undefined) {
      return undefined;
    }

    return {
      indentation: configured?.indentation ?? DEFAULT_JSON_INDENTATION,
      path: this.resolvePath(
        args.workingDirectory,
        this.readPathFlag(args.options.json, configured?.path),
      ),
    };
  }

  /**
   * Where the rendered badges go as a document of their own, if anywhere.
   *
   * Only ever asked for on the command line. A configured markdown
   * destination carries markers and is spliced into rather than overwritten,
   * which is a different sink.
   */
  private resolveMarkdown(
    args: ResolveDestinationsArguments,
  ): MarkdownDocumentDestination | undefined {
    if (args.options.markdown === undefined) {
      return undefined;
    }

    const flag = args.options.markdown;

    return {
      description: args.configuration.output.markdown?.description,
      path:
        flag === true
          ? undefined
          : this.resolvePath(args.workingDirectory, flag),
    };
  }

  /** Turns a written destination path into an absolute one. */
  private resolvePath(
    workingDirectory: string,
    destinationPath: string | undefined,
  ): string | undefined {
    return destinationPath === undefined
      ? undefined
      : path.resolve(workingDirectory, destinationPath);
  }

  /**
   * Which file the badge block is spliced into, if any.
   *
   * The path is never defaulted. Splicing rewrites a file somebody else wrote
   * the rest of, so a run that guessed the filename would edit a document
   * nobody pointed it at.
   *
   * A configured `write` function is a destination in its own right: it picks
   * the file itself, so a configuration that supplies one without a path still
   * has a splice destination.
   */
  private resolveReadme(
    args: ResolveDestinationsArguments,
    named: boolean,
  ): ResolvedCodometerMarkdownOutputConfiguration | undefined {
    if (named && args.options.readme === undefined) {
      return undefined;
    }

    const configured = args.configuration.output.markdown ?? {
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      path: undefined,
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      write: undefined,
    };
    const destinationPath = args.options.readme ?? configured.path;

    if (destinationPath === undefined && configured.write === undefined) {
      return undefined;
    }

    return {
      ...configured,
      path: this.resolvePath(args.workingDirectory, destinationPath),
    };
  }

  /** Keeps the names `--check` knows and complains about the rest. */
  private validateCheckNames(names: string[], errors: string[]): Set<string> {
    const accepted = new Set<string>();

    for (const name of names) {
      if (CHECK_NAMES.includes(name)) {
        accepted.add(name);
        continue;
      }

      errors.push(
        this.describeAcceptedCheckNames(`--check does not accept "${name}"`),
      );
    }

    return accepted;
  }

  // 🌎 Public Methods

  /**
   * Lists the files this run writes, relative to the measured directory.
   *
   * What codometer writes is what codometer must not measure, so this is also
   * the exclusion list handed to the measurement.
   */
  listOutputPaths(args: ListOutputPathsArguments): string[] {
    const paths = [
      args.destinations.json?.path,
      args.destinations.markdown?.path,
      args.destinations.readme?.path,
    ];

    return paths
      .filter((destinationPath) => destinationPath !== undefined)
      .map((destinationPath) =>
        path
          .relative(args.workingDirectory, destinationPath)
          .split(path.sep)
          .join("/"),
      );
  }

  /**
   * Resolves where each of the three outputs goes.
   *
   * With nothing named anywhere the badges go to the console, which is what
   * makes a bare run useful without also making it write a file nobody asked
   * for.
   */
  resolveDestinations(args: ResolveDestinationsArguments): RunDestinations {
    const named = this.namesDestination(args.options);
    const json = this.resolveJson(args, named);
    const markdown = this.resolveMarkdown(args);
    const readme = this.resolveReadme(args, named);

    if (json === undefined && markdown === undefined && readme === undefined) {
      return {
        json: undefined,
        markdown: {
          description: args.configuration.output.markdown?.description,
          path: undefined,
        },
        readme: undefined,
      };
    }

    return { json, markdown, readme };
  }

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * `--write --check reports` is refused rather than obeyed: nothing can be
   * stale immediately after being written, so a run asking for both has
   * misunderstood one of them and would pass whatever it was meant to catch.
   *
   * A `--json` path with neither flag is refused for the mirror-image reason:
   * it names a file the run was never going to write.
   */
  selectMode(options: CodometerCommandOptions): ModeSelection {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const mode: RunMode = {
      checksLimits: names.has(CHECK_LIMITS),
      checksReports: names.has(CHECK_REPORTS),
      writes: options.write === true,
    };

    if (mode.writes && mode.checksReports) {
      errors.push(
        `--write cannot be combined with --check ${CHECK_REPORTS}: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check ${CHECK_REPORTS} separately.`,
      );
    }

    this.requireWrittenReport(options, mode, errors);

    return { errors, mode };
  }

  /**
   * Whether a run covers a whole repository or one project inside one.
   *
   * Decided from the measured directory alone, not by walking upward: a
   * directory carrying a repository marker is a repository, and anything
   * beneath one is a project. The first badge group is headed by this, so a
   * project README saying `Repository` over figures that only ever covered
   * that project is the thing it exists to prevent.
   */
  selectScope(workingDirectory: string): MeasurementScope {
    const isRepository = REPOSITORY_ROOT_MARKERS.some((marker) =>
      existsSync(path.join(workingDirectory, marker)),
    );

    return isRepository ? "repository" : "project";
  }
}
