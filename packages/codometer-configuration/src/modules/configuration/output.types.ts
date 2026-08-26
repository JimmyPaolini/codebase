// 🏷️ Types

import type { CodeStatisticsResult } from "./statistics.types";

/** Where and how the JSON statistics report is written. */
export interface CodometerJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/**
 * Where and how the markdown report is written.
 *
 * `render` and `write` are the two halves of the built-in behavior, each
 * replaceable on its own: `render` turns the statistics into markdown, and
 * `write` decides which file that markdown lands in and how. Supplying only
 * one keeps the built-in other half.
 *
 * `path` is optional because a `write` function may choose the file itself —
 * but one of the two must be present, or there is no markdown output at all.
 */
export interface CodometerMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  path?: string | undefined;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  write?: undefined | WriteMarkdownOutput;
}

/** Destinations the measured statistics are written to. */
export interface CodometerOutputConfiguration {
  json?: CodometerJsonOutputConfiguration | undefined;
  markdown?: CodometerMarkdownOutputConfiguration | undefined;
}

/**
 * The anchor mechanics a `write` function would otherwise have to reimplement.
 *
 * Splicing a generated block between two HTML comments is the common case, so
 * it is one call away even for a writer that picks its own file.
 */
export interface MarkdownAnchorHelpers {
  endMarker: string;
  startMarker: string;
  /**
   * Splices the anchored block into a file, appending it when the markers are
   * absent, and creating the file when it does not exist.
   *
   * In check mode nothing is written and the return value reports whether the
   * file already holds the current block. Defaults to the rendered content and
   * the configured path; pass either to override.
   */
  syncAnchoredBlock: (overrides?: {
    content?: string | undefined;
    path?: string | undefined;
  }) => boolean;
  /** The content wrapped in the configured markers, ready to place anywhere. */
  wrapInAnchors: (content?: string) => string;
}

/** What a `render` function is handed. */
export interface RenderMarkdownArguments {
  /** The configured description, for a renderer that wants to place it itself. */
  description: string | undefined;
  /**
   * The built-in badge rendering of these same statistics.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderBadges: () => string;
  statistics: CodeStatisticsResult;
}

/** Turns the measured statistics into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/** JSON output destination with defaults applied. */
export interface ResolvedCodometerJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `write` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCodometerMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  write: undefined | WriteMarkdownOutput;
}

/**
 * Output destinations with defaults applied.
 *
 * A destination stays `undefined` when nothing named it. Absent means "do not
 * write this file", which is a different instruction from a default path
 * nobody asked for.
 */
export interface ResolvedCodometerOutputConfiguration {
  json: ResolvedCodometerJsonOutputConfiguration | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
}

/** What a `write` function is handed. */
export interface WriteMarkdownArguments {
  anchors: MarkdownAnchorHelpers;
  /** True when nothing may be written and the file is only being inspected. */
  check: boolean;
  /** The markdown produced by the render step. */
  content: string;
  /** The configured path, resolved against the measured directory. */
  path: string | undefined;
  statistics: CodeStatisticsResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
