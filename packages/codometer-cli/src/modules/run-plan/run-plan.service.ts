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
  FORMAT_MARKDOWN,
  FORMAT_NAMES,
} from "./run-plan.constants";

import type { MeasureCommandOptions } from "../measure/measure.types";
import type {
  ListOutputPathsArguments,
  MeasureFormat,
  ModeSelection,
  ResolveDestinationsArguments,
  ResolveDestinationsResult,
  ResolvedJsonDestination,
  ResolvedMarkdownDestination,
  RunDestinations,
  RunMode,
} from "./run-plan.types";
import type {
  CodometerFormat,
  ResolvedCodometerOutput,
} from "@codometer/configuration";
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

  /** Finds the first output of the given type, if the configuration named one. */
  private findConfiguredOutput<Type extends ResolvedCodometerOutput["type"]>(
    outputs: readonly ResolvedCodometerOutput[],
    type: Type,
  ): Extract<ResolvedCodometerOutput, { type: Type }> | undefined {
    return outputs.find(
      (output): output is Extract<ResolvedCodometerOutput, { type: Type }> =>
        output.type === type,
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

  /** Where the report goes, if this run resolves that destination at all. */
  private resolveJson(
    args: ResolveDestinationsArguments,
    named: boolean,
    errors: string[],
  ): ResolvedJsonDestination | undefined {
    const { outputJson } = args.options;

    if (named && outputJson === undefined) {
      return undefined;
    }

    const configured = this.findConfiguredOutput(
      args.configuration.outputs,
      "json",
    );

    if (typeof outputJson === "string") {
      return {
        custom: configured?.custom ?? [],
        indentation: configured?.indentation ?? DEFAULT_JSON_INDENTATION,
        path: path.resolve(args.workingDirectory, outputJson),
      };
    }

    if (configured === undefined) {
      // `outputJson === true` is a bare flag, asking this run to write the
      // report wherever the configuration says to — refused when nothing
      // does, since there is then nowhere to put it. `undefined` with
      // nothing configured either is simply not part of this run.
      if (outputJson === true) {
        errors.push(
          `--output-json needs a path, or a "json" entry in the configuration's "outputs" to resolve one from: neither was found, so there is nowhere to write it. Pass --output-json <path>, or declare a "json" output.`,
        );
      }

      return undefined;
    }

    return {
      custom: configured.custom,
      indentation: configured.indentation,
      path: path.resolve(args.workingDirectory, configured.path),
    };
  }

  /**
   * Which markdown file the badge block goes into, if any.
   *
   * One sink rather than two. The block is spliced between its markers when
   * the file already carries them, and appended with them when it does not,
   * so the same flag serves a README somebody else wrote the rest of and a
   * file that holds nothing but badges.
   *
   * The path is never defaulted from nothing: it comes from the command line,
   * or from a configured `markdown` output's own path or `write`. A
   * configured `write` function is a destination in its own right — it picks
   * the file itself — so it counts as "resolvable" even without a path.
   */
  private resolveMarkdown(
    args: ResolveDestinationsArguments,
    named: boolean,
    errors: string[],
  ): ResolvedMarkdownDestination | undefined {
    const { outputMarkdown } = args.options;

    if (named && outputMarkdown === undefined) {
      return undefined;
    }

    const configured = this.findConfiguredOutput(
      args.configuration.outputs,
      "markdown",
    );

    if (typeof outputMarkdown === "string") {
      return {
        custom: configured?.custom ?? [],
        description: configured?.description,
        endMarker: configured?.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
        path: this.resolvePath(args.workingDirectory, outputMarkdown),
        startMarker: configured?.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
        type: "markdown",
        write: configured?.write,
      };
    }

    if (configured === undefined) {
      // `outputMarkdown === true` is a bare flag, refused when the
      // configuration names no markdown output at all — there is then
      // neither a path nor a `write` function to resolve a destination from.
      // `undefined` with nothing configured either is simply not part of
      // this run.
      if (outputMarkdown === true) {
        errors.push(
          `--output-markdown needs a path, or a "markdown" entry in the configuration's "outputs" to resolve one from: neither was found, so there is nowhere to write it. Pass --output-markdown <path>, or declare a "markdown" output.`,
        );
      }

      return undefined;
    }

    return {
      custom: configured.custom,
      description: configured.description,
      endMarker: configured.endMarker,
      path: this.resolvePath(args.workingDirectory, configured.path),
      startMarker: configured.startMarker,
      type: "markdown",
      write: configured.write,
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
   * Resolves which files the run writes, and refuses a destination this run
   * has no way to have produced.
   *
   * `--output-json`/`--output-markdown` passed bare ask this run to write
   * wherever the configuration says to; refused before anything is measured
   * when the configuration names no such output at all, since there is then
   * nowhere to write it.
   */
  resolveDestinations(
    args: ResolveDestinationsArguments,
  ): ResolveDestinationsResult {
    const named =
      args.options.outputJson !== undefined ||
      args.options.outputMarkdown !== undefined;
    const errors: string[] = [];
    const destinations: RunDestinations = {
      json: this.resolveJson(args, named, errors),
      markdown: this.resolveMarkdown(args, named, errors),
    };

    return { destinations, errors };
  }

  /**
   * Reads `--format` into what the run prints, falling back to the resolved
   * configuration's own `format` when the flag was left off.
   *
   * The fallback never infers from which other flags are present — omitting
   * `--format` always reads the same value the configuration declares,
   * whether or not this run also writes a file.
   */
  resolveFormat(
    value: string | undefined,
    configuredFormat: CodometerFormat,
    errors: string[],
  ): MeasureFormat | undefined {
    if (value === undefined) {
      return configuredFormat;
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
   * Reads the flags into what the run writes and what it fails on.
   *
   * Writing is answered per output, by whether that output's own
   * `--output-*` flag was passed at all. `--output-json`/`--output-markdown`
   * together with `--check reports` is refused rather than obeyed: nothing
   * can be stale immediately after being written, so a run asking for both on
   * the same output has misunderstood one of them and would silently compare
   * instead of writing.
   */
  selectMode(options: MeasureCommandOptions): ModeSelection {
    const errors: string[] = [];
    const names = this.readCheckNames(options.check, errors);
    const mode: RunMode = {
      checksLimits: names.has(CHECK_LIMITS),
      checksReports: names.has(CHECK_REPORTS),
      writesJson: options.outputJson !== undefined,
      writesMarkdown: options.outputMarkdown !== undefined,
    };

    if (mode.checksReports && (mode.writesJson || mode.writesMarkdown)) {
      errors.push(
        `--output-json or --output-markdown cannot be combined with --check ${CHECK_REPORTS}: a report cannot be stale in the run that just wrote it. Drop --check ${CHECK_REPORTS}, or run it separately from the run that writes.`,
      );
    }

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
