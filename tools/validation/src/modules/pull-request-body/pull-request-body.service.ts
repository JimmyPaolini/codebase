import { readFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";

import {
  REQUIRED_HEADINGS,
  TEMPLATE_COMMENT_PATTERN,
  TEMPLATE_COMMENT_PREFIX_LENGTH,
} from "./pull-request-body.constants";

import type { BodyVerdict } from "./pull-request-body.types";

/**
 * Checks a pull request description against the template it started as.
 *
 * Two questions, kept apart because their sources are: the four headings are
 * the convention and are named in this module's constants, while the prompts
 * are whatever the template currently holds and are read from it at runtime. A
 * prompt added to the template tomorrow is therefore checked with no change
 * here — which the previous inline shell, with its hard-coded prefixes, could
 * not manage.
 */
@Injectable()
export class PullRequestBodyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The leading run of a prompt that a description has to still carry.
   *
   * Newlines are collapsed so a prompt wrapped across lines in the template is
   * compared as the one line a description carries it as.
   */
  private prefixOf(templateComment: string): string {
    return templateComment
      .replaceAll(/\s+/gu, " ")
      .slice(0, TEMPLATE_COMMENT_PREFIX_LENGTH);
  }

  // 🌎 Public Methods

  /** Both lists of failures, from one description and the template's prompts. */
  public checkBody(options: {
    readonly body: string;
    readonly templateComments: readonly string[];
  }): BodyVerdict {
    return {
      missingHeadings: this.findMissingHeadings(options.body),
      unfilledComments: this.findUnfilledComments(options),
    };
  }

  /** Reads the prompts the template currently holds. */
  public extractTemplateComments(templatePath: string): string[] {
    return [
      ...readFileSync(templatePath, "utf8").matchAll(TEMPLATE_COMMENT_PATTERN),
    ].map((match) => match[0]);
  }

  /** Every required heading the description does not carry. */
  public findMissingHeadings(body: string): string[] {
    const lines = new Set(body.split("\n").map((line) => line.trimEnd()));

    return REQUIRED_HEADINGS.filter((heading) => !lines.has(heading));
  }

  /** Every template prompt the description still carries. */
  public findUnfilledComments(options: {
    readonly body: string;
    readonly templateComments: readonly string[];
  }): string[] {
    const collapsedBody = options.body.replaceAll(/\s+/gu, " ");

    return options.templateComments.filter((templateComment) =>
      collapsedBody.includes(this.prefixOf(templateComment)),
    );
  }
}
