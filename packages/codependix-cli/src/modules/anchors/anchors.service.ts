import { Injectable } from "@nestjs/common";

import { buildEndMarker, buildStartMarker } from "./anchors.constants";
import { AnchorNotFoundError } from "./anchors.errors";

import type {
  AnchorCheckResult,
  AnchorLocationArguments,
} from "./anchors.types";

/**
 * Reads and rewrites codependix's own named anchor blocks in a Markdown file.
 *
 * Owns its comment-marker syntax outright — a start marker and an end marker,
 * each an HTML comment naming the anchor — with zero dependency on any
 * `conformetry-*` package, per issue #242's decision that codependix must be
 * able to evolve its export format without touching, or being constrained by,
 * conformetry's template-conformance mechanism. See `anchors.constants.ts`
 * for the exact marker text.
 *
 * An anchor block that does not exist is always an error, in both `--check`
 * and `--write`: creating one unattended risks appending it to the wrong
 * place in a document someone else is authoring, so codependix asks a human
 * to place the markers once, by hand, rather than guessing.
 */
@Injectable()
export class AnchorsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the pattern matching a named anchor block and its inner content. */
  private buildAnchorPattern(anchorName: string): RegExp {
    const start = this.escapeForPattern(buildStartMarker(anchorName));
    const end = this.escapeForPattern(buildEndMarker(anchorName));

    return new RegExp(String.raw`${start}\n([\s\S]*?)\n${end}`, "u");
  }

  /** Escapes a string so it can be embedded literally in a regular expression. */
  private escapeForPattern(value: string): string {
    return value.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
  }

  // 🌎 Public Methods

  /**
   * Compares a Markdown file's anchor against a freshly computed export.
   *
   * `--check` reads this and reports drift without writing anything; `--write`
   * is what acts on it. Throws `AnchorNotFoundError` when the anchor is
   * missing, which is what fails a `--check` run against a project that never
   * had the markers placed.
   */
  checkAnchor(
    args: AnchorLocationArguments & { freshContent: string },
  ): AnchorCheckResult {
    const currentContent = this.extractAnchorContent(args);

    if (currentContent === undefined) {
      throw new AnchorNotFoundError(args.anchorName, args.filePath);
    }

    return {
      currentContent,
      freshContent: args.freshContent,
      isCurrent: currentContent.trim() === args.freshContent.trim(),
    };
  }

  /** Reads a named anchor's current content, or `undefined` when it is absent. */
  extractAnchorContent(args: AnchorLocationArguments): string | undefined {
    return this.buildAnchorPattern(args.anchorName).exec(args.fileContent)?.[1];
  }

  /** Whether a named anchor block is present in a file's content. */
  hasAnchor(args: AnchorLocationArguments): boolean {
    return this.buildAnchorPattern(args.anchorName).test(args.fileContent);
  }

  /**
   * Replaces a named anchor's content in place, leaving the rest untouched.
   *
   * Idempotent: writing the same content twice produces byte-identical output,
   * since the replacement is always rendered in the same canonical shape —
   * marker, trimmed content, marker — regardless of what whitespace the
   * anchor held before.
   */
  replaceAnchorContent(
    args: AnchorLocationArguments & { newContent: string },
  ): string {
    if (!this.hasAnchor(args)) {
      throw new AnchorNotFoundError(args.anchorName, args.filePath);
    }

    const start = buildStartMarker(args.anchorName);
    const end = buildEndMarker(args.anchorName);
    const trimmedContent = args.newContent.trim();

    return args.fileContent.replace(
      this.buildAnchorPattern(args.anchorName),
      () => `${start}\n${trimmedContent}\n${end}`,
    );
  }

  /** Wraps content in a fresh pair of markers, for placing a new anchor by hand. */
  wrapInAnchors(anchorName: string, content: string): string {
    return [
      buildStartMarker(anchorName),
      content.trim(),
      buildEndMarker(anchorName),
    ].join("\n");
  }
}
