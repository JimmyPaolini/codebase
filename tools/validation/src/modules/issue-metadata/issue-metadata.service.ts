import { Injectable } from "@nestjs/common";

import {
  SCOPE_FIELD_LABEL,
  SCOPE_LABEL_PREFIX,
  SOURCE_LABEL_PREFIX,
  SOURCE_LABELS,
  TYPE_FIELD_LABEL,
  TYPE_LABEL_PREFIX,
} from "./issue-metadata.constants";

import type {
  GroupedLabels,
  IssueFormAnswers,
  IssueMetadata,
  IssueMetadataResolution,
  MetadataVerdict,
} from "./issue-metadata.types";

/**
 * Reads an issue's metadata and says whether its labels agree with it.
 *
 * Pure throughout: every method is a function of what it is handed, so the
 * whole rule set is testable without an issue, a token, or a network. Reading
 * the metadata from GitHub is the command's job, not this one's.
 *
 * Unlike a pull request title, an issue title is free text with no enforced
 * format — a quick backlog-idea title is a normal, intentional shape here.
 * The source of truth for what an issue's labels *should* be is instead its
 * body, when it was filed through `issue.yml`: GitHub renders a submitted
 * Type or Scope dropdown answer as `### Type` / `### Scope`, a blank line,
 * then the answer. An issue opened directly through `gh issue create` or the
 * API — every `source:agent` issue in this repository today — carries no
 * such markers, so there is nothing to compare labels against and the checks
 * fall back to pure label-presence rules.
 */
@Injectable()
export class IssueMetadataService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * At least one scope label. When the body named a Scope answer, the label
   * it implies must be present too.
   */
  private checkScopeLabels(
    options: {
      readonly formAnswers: IssueFormAnswers;
      readonly issueNumber: string;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const { formAnswers, issueNumber } = options;

    if (formAnswers.scope === undefined) {
      if (labels.scopeLabels.length === 0) {
        record("❌ No scope label");
      }
      return;
    }

    const expected = `${SCOPE_LABEL_PREFIX}${formAnswers.scope}`;
    if (!labels.scopeLabels.includes(expected)) {
      record(
        `❌ Missing scope label: ${expected}`,
        `gh issue edit ${issueNumber} --add-label ${expected}`,
      );
    }
  }

  /**
   * Exactly one source label, and it is one of the two that exist.
   *
   * There is nothing in the body to compare this against — the source
   * declares who opened the issue — so every other `source:` label is simply
   * unexpected. A missing one gets two alternative commands rather than one
   * command carrying a shell comment, because either is right and only a
   * person can say which.
   */
  private checkSourceLabel(
    issueNumber: string,
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const sourceLabel = labels.sourceLabels[0];
    const isValid =
      labels.sourceLabels.length === 1 &&
      sourceLabel !== undefined &&
      SOURCE_LABELS.includes(sourceLabel);

    if (isValid) {
      return;
    }

    const found =
      labels.sourceLabels.length === 0 ? "none" : labels.sourceLabels.join(" ");

    record(
      `❌ Expected exactly one source label: ${SOURCE_LABELS.join(" or ")} (found: ${found})`,
      ...labels.sourceLabels.map(
        (label) => `gh issue edit ${issueNumber} --remove-label ${label}`,
      ),
      "add exactly one source label, either:",
      ...SOURCE_LABELS.map(
        (label) => `gh issue edit ${issueNumber} --add-label ${label}`,
      ),
    );
  }

  /**
   * Exactly one type label. When the body named a Type answer, it must be
   * that answer's label — otherwise any single type label is accepted, since
   * an issue with no template submission has nothing to compare against.
   */
  private checkTypeLabel(
    options: {
      readonly formAnswers: IssueFormAnswers;
      readonly issueNumber: string;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const { formAnswers, issueNumber } = options;

    if (formAnswers.type === undefined) {
      this.checkTypeLabelPresence(issueNumber, labels, record);
      return;
    }

    const expected = `${TYPE_LABEL_PREFIX}${formAnswers.type}`;
    const hasExpected = labels.typeLabels.includes(expected);
    if (labels.typeLabels.length === 1 && hasExpected) {
      return;
    }

    const found =
      labels.typeLabels.length === 0 ? "none" : labels.typeLabels.join(" ");
    record(
      `❌ Expected exactly one type label: ${expected} (found: ${found})`,
      ...labels.typeLabels
        .filter((label) => label !== expected)
        .map((label) => `gh issue edit ${issueNumber} --remove-label ${label}`),
      ...(hasExpected
        ? []
        : [`gh issue edit ${issueNumber} --add-label ${expected}`]),
    );
  }

  /**
   * Exactly one type label, when the body named no Type answer to compare
   * against — an issue with no template submission has nothing beyond
   * presence to check, so any single type label is accepted.
   */
  private checkTypeLabelPresence(
    issueNumber: string,
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    if (labels.typeLabels.length === 1) {
      return;
    }

    const found =
      labels.typeLabels.length === 0 ? "none" : labels.typeLabels.join(" ");
    record(
      `❌ Expected exactly one type label (found: ${found})`,
      ...labels.typeLabels
        .slice(1)
        .map((label) => `gh issue edit ${issueNumber} --remove-label ${label}`),
    );
  }

  /**
   * Reads one dropdown field's answer out of a rendered issue-form body.
   *
   * GitHub converts each submitted field into `### <label>`, a blank line,
   * then the answer on its own line — so capturing the first non-blank line
   * after the heading is enough to read a dropdown's answer back out. An
   * unfilled optional field renders as the literal placeholder
   * `_No response_`, which is treated the same as no answer at all.
   */
  private extractFormField(body: string, label: string): string | undefined {
    const pattern = new RegExp(
      String.raw`### ${label}\r?\n\r?\n([^\r\n]+)`,
      "u",
    );
    const match = pattern.exec(body);
    const value = match?.[1]?.trim();

    return value === undefined || value === "" || value === "_No response_"
      ? undefined
      : value;
  }

  /** Whether this value can be read by property name at all. */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  /** Every label name, with the nameless entries dropped. */
  private readLabelNames(entries: unknown[]): string[] {
    return entries
      .map((entry) => {
        if (typeof entry === "string") {
          return entry.trim();
        }
        if (!this.isRecord(entry)) {
          return "";
        }
        const name = entry["name"];
        return typeof name === "string" ? name.trim() : "";
      })
      .filter((name) => name !== "");
  }

  // 🌎 Public Methods

  /**
   * Every way this issue's labels disagree with it, and the commands that
   * fix each one.
   */
  public checkMetadata(options: {
    readonly formAnswers: IssueFormAnswers;
    readonly issueNumber: string;
    readonly metadata: IssueMetadata;
  }): MetadataVerdict {
    const failures: string[] = [];
    const remediationCommands: string[] = [];
    const labels = this.groupLabels(options.metadata.labelNames);
    const record = (failure: string, ...commands: string[]): void => {
      failures.push(failure);
      remediationCommands.push(...commands);
    };

    this.checkTypeLabel(options, labels, record);
    this.checkScopeLabels(options, labels, record);
    this.checkSourceLabel(options.issueNumber, labels, record);

    return { failures, remediationCommands };
  }

  /** Whatever went wrong, as the one line a report can carry. */
  public describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Sorts one issue's labels into the families the checks ask about. */
  public groupLabels(labelNames: readonly string[]): GroupedLabels {
    return {
      scopeLabels: labelNames.filter((name) =>
        name.startsWith(SCOPE_LABEL_PREFIX),
      ),
      sourceLabels: labelNames.filter((name) =>
        name.startsWith(SOURCE_LABEL_PREFIX),
      ),
      typeLabels: labelNames.filter((name) =>
        name.startsWith(TYPE_LABEL_PREFIX),
      ),
    };
  }

  /**
   * Reads the Type and Scope answers out of a rendered `issue.yml`
   * submission, if this body carries them at all.
   */
  public parseFormAnswers(body: string): IssueFormAnswers {
    const type = this.extractFormField(body, TYPE_FIELD_LABEL);
    const scope = this.extractFormField(body, SCOPE_FIELD_LABEL);

    return {
      ...(type === undefined ? {} : { type }),
      ...(scope === undefined ? {} : { scope }),
    };
  }

  /** Reads the metadata out of a `gh issue view` document. */
  public resolveFromDocument(documentText: string): IssueMetadataResolution {
    let issue: unknown;

    try {
      issue = JSON.parse(documentText);
    } catch (error) {
      return {
        failure: `❌ Unable to parse the gh issue view output: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    const document: Record<string, unknown> = this.isRecord(issue) ? issue : {};

    return {
      metadata: {
        body: typeof document["body"] === "string" ? document["body"] : "",
        labelNames: this.readLabelNames(
          Array.isArray(document["labels"]) ? document["labels"] : [],
        ),
      },
      resolved: true,
    };
  }

  /** Reads the metadata out of the two environment documents. */
  public resolveFromEnvironment(options: {
    readonly body: string;
    readonly labelsDocument: string;
  }): IssueMetadataResolution {
    let parsedLabels: unknown;

    try {
      parsedLabels = JSON.parse(options.labelsDocument);
    } catch (error) {
      return {
        failure: `❌ Unable to parse ISSUE_LABELS as JSON: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    if (!Array.isArray(parsedLabels)) {
      return {
        failure: "❌ Expected ISSUE_LABELS to be a JSON array",
        resolved: false,
      };
    }

    return {
      metadata: {
        body: options.body,
        labelNames: this.readLabelNames(parsedLabels),
      },
      resolved: true,
    };
  }
}
