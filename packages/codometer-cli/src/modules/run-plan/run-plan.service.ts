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
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  FORMAT_NAMES,
} from "./run-plan.constants";

import type { MeasureCommandOptions } from "../measure/measure.types";
import type {
  JsonDestination,
  ListOutputPathsArguments,
  MeasureFormat,
  ModeSelection,
  ResolveDestinationsArguments,
  RunDestinations,
  RunMode,
} from "./run-plan.types";
import type { ResolvedCodometerMarkdownOutputConfiguration } from "@codometer/configuration";
import type { MeasurementScope } from "@codometer/output";

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
  private namesDestination(options: MeasureCommandOptions): boolean {
    return (
      options.outputJson !== undefined || options.outputMarkdown !== undefined
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
   * Reads `--format` into what the run prints, if anything.
   *
   * Left off, a run that writes or compares a file prints nothing — its output
   * is the file, and a document on standard output as well is what a pipeline
   * reading that stream would choke on. A run that touches no file prints the
   * badges instead, which is what makes a bare `codometer` useful with no
   * arguments at all.
   *
   * An unknown format is refused rather than defaulted. Every other flag here
   * names something the run does, and silently printing markdown to a command
   * line that asked for something else would answer a question nobody asked.
   */
  private readFormat(
    value: string | undefined,
    mode: RunMode,
    errors: string[],
  ): MeasureFormat | undefined {
    if (value === undefined) {
      return this.touchesFiles(mode) ? undefined : FORMAT_MARKDOWN;
    }

    const matched = FORMAT_NAMES.find((name) => name === value);

    if (matched === undefined) {
      errors.push(
        `--format does not accept "${value}". It takes one of ${FORMAT_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--format ${FORMAT_MARKDOWN}".`,
      );
    }

    return matched;
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
  private requireWrittenOutput(
    options: MeasureCommandOptions,
    mode: RunMode,
    errors: string[],
  ): void {
    if (mode.writes || mode.checksReports) {
      return;
    }

    const named = [
      { flag: "--output-json", format: FORMAT_JSON, path: options.outputJson },
      {
        flag: "--output-markdown",
        format: FORMAT_MARKDOWN,
        path: options.outputMarkdown,
      },
    ].filter((option) => option.path !== undefined);

    for (const option of named) {
      errors.push(
        `${option.flag} ${option.path} needs --write or --check ${CHECK_REPORTS}: a run that neither writes that file nor compares it would leave it exactly as it found it. Add --write to write it, --check ${CHECK_REPORTS} to fail on a stale one, or ask for --format ${option.format} to read it on the console instead.`,
      );
    }
  }

  /** Where the report goes, if anywhere. */
  private resolveJson(
    args: ResolveDestinationsArguments,
    named: boolean,
  ): JsonDestination | undefined {
    if (named && args.options.outputJson === undefined) {
      return undefined;
    }

    const configured = args.configuration.output.json;

    if (args.options.outputJson === undefined && configured === undefined) {
      return undefined;
    }

    return {
      indentation: configured?.indentation ?? DEFAULT_JSON_INDENTATION,
      path: this.resolvePath(
        args.workingDirectory,
        args.options.outputJson ?? configured?.path,
      ),
    };
  }

  /**
   * Which markdown file the badge block goes into, if any.
   *
   * One sink rather than two. The block is spliced between its markers when
   * the file already carries them, and appended with them when it does not,
   * so the same flag serves a README somebody else wrote the rest of and a
   * file that holds nothing but badges — which is why there is no longer a
   * separate whole-document destination to pick between.
   *
   * The path is never defaulted. Splicing rewrites a file somebody else wrote,
   * so a run that guessed the filename would edit a document nobody pointed
   * it at.
   *
   * A configured `write` function is a destination in its own right: it picks
   * the file itself, so a configuration that supplies one without a path still
   * has a destination.
   */
  private resolveMarkdown(
    args: ResolveDestinationsArguments,
    named: boolean,
  ): ResolvedCodometerMarkdownOutputConfiguration | undefined {
    if (named && args.options.outputMarkdown === undefined) {
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
    const destinationPath = args.options.outputMarkdown ?? configured.path;

    if (destinationPath === undefined && configured.write === undefined) {
      return undefined;
    }

    return {
      ...configured,
      path: this.resolvePath(args.workingDirectory, destinationPath),
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
   * Whether the run does anything with a file at all.
   *
   * A run that neither writes nor compares has nothing to do with a file, so
   * every destination it resolved is left alone and the badges go to the
   * console instead.
   */
  private touchesFiles(mode: RunMode): boolean {
    return mode.writes || mode.checksReports;
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
   * Resolves which files the run writes.
   *
   * Only files. A run that resolves none still prints its badges, but that is
   * `--format`'s doing rather than a destination standing in for the console,
   * which is what let a configured path quietly put a second document on the
   * stream a pipeline was reading.
   */
  resolveDestinations(args: ResolveDestinationsArguments): RunDestinations {
    const named = this.namesDestination(args.options);

    return {
      json: this.resolveJson(args, named),
      markdown: this.resolveMarkdown(args, named),
    };
  }

  /**
   * Reads the flags into what the run writes and what it fails on.
   *
   * `--write --check reports` is refused rather than obeyed: nothing can be
   * stale immediately after being written, so a run asking for both has
   * misunderstood one of them and would pass whatever it was meant to catch.
   *
   * An `--output-*` path with neither flag is refused for the mirror-image
   * reason: it names a file the run was never going to write. The failure
   * this catches is an nx target that quietly lost its `--write` — it exited
   * clean, wrote nothing, and the first thing to notice was a pull request
   * section rendering as though the project had changed nothing.
   */
  selectMode(options: MeasureCommandOptions): ModeSelection {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const mode: RunMode = {
      checksLimits: names.has(CHECK_LIMITS),
      checksReports: names.has(CHECK_REPORTS),
      writes: options.write === true,
    };
    const format = this.readFormat(options.format, mode, errors);

    if (mode.writes && mode.checksReports) {
      errors.push(
        `--write cannot be combined with --check ${CHECK_REPORTS}: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check ${CHECK_REPORTS} separately.`,
      );
    }

    this.requireWrittenOutput(options, mode, errors);

    return { errors, format, mode };
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
