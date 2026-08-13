// 🏷️ Types

/** Metadata for a discovered source comment. */
export interface CommentInfo {
  column: number;
  line: number;
  pos: number;
  text: string;
}

/**
 * A structured conformance error produced by any validator.
 *
 * Two discriminating fields identify the error category:
 * - `errorType` — what kind of element is missing
 * - `language` — which validator / file format produced the error.
 *
 * All errors represent a *missing* element; there is no separate action field.
 */
export interface ConformanceError {
  /** Actual value found in the instance (populated for value-mismatch errors). */
  readonly actual?: string;
  /** Category of missing element. */
  readonly errorType: ConformanceErrorType;
  /** Snippet of the template content that should be present in the instance. */
  readonly expected?: string;
  /** One-line actionable suggestion for the coding agent. */
  readonly fix: string;
  /** 1-based column number in the instance file where the error was detected. */
  readonly instanceColumn?: number;
  /** 1-based line number in the instance file where the error was detected. */
  readonly instanceLine?: number;
  /**
   * JSON dot-notation path in the instance document where the error was
   * detected, e.g. `"scripts.build[0]"`.
   */
  readonly instancePath?: string;
  /**
   * File format of the validator that produced this error.
   * Absent for `'file'` and `'directory'` errors.
   */
  readonly language?: ConformanceErrorLanguage;
  /** Short human-readable description of what is missing. */
  readonly message: string;
  /**
   * 1-based column number in the (rendered) template file that defines the
   * requirement.
   */
  readonly templateColumn?: number;
  /**
   * 1-based line number in the (rendered) template file that defines the
   * requirement.
   */
  readonly templateLine?: number;
  /** JSON dot-notation path in the template document. */
  readonly templatePath?: string;
}

/**
 * The language / file format processed by the validator that produced the
 * error. Absent for `'file'` and `'directory'` errors.
 */
export type ConformanceErrorLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "python"
  | "text"
  | "typescript";

/** Category of the missing element that caused the conformance failure. */
export type ConformanceErrorType = "code" | "comment" | "directory" | "file";

/** The validation result for a generated instance directory, grouping per-file results under the directory name. */
export interface InstanceDirectoryValidationResult {
  directoryName: string;
  results: InstanceFileValidationResult[];
}

/** The validation result for a single generated file. */
export interface InstanceFileValidationResult {
  errors: ConformanceError[];
  filename: string;
  instanceFilePath: string;
  templateFilePath: string;
}

/** Recursive JSON value used for structural JSON conformance validation. */
export type JsonValue =
  | boolean
  | JsonValue[]
  | null
  | number
  | string
  | { [key: string]: JsonValue };

/** Source location metadata for AST missing-node errors. */
export interface ResolvedErrorLocation {
  breadcrumb: string;
  instanceCharacter: number;
  instanceLine: number;
  snippet: string;
  templateCharacter: number;
  templateLine: number;
}

/** CLI option payload parsed by nest-commander. */
export interface ValidatorCommandOptions {
  projects?: string[];
  rules?: ValidatorRuleName[];
}

/** Per-project validation result payload. */
export interface ValidatorProjectResult {
  passed: boolean;
  projectName: string;
  projectRootPath: string;
  rules: ValidatorRuleResult[];
}

/** Input options for a validation request. */
export interface ValidatorRequest {
  projects?: string[];
  rules?: string[];
}

/** Top-level validation response payload. */
export interface ValidatorResult {
  generatedAt: string;
  passed: boolean;
  requestedProjects: string[];
  results: ValidatorProjectResult[];
  selectedRules: ValidatorRuleName[];
  summary: ValidatorSummary;
}

/** Allowed conformance validation rule names. */
export type ValidatorRuleName =
  | "jupyter-notebook-application"
  | "nestjs-command-application"
  | "nestjs-command-module"
  | "nestjs-dataloader-module"
  | "nestjs-graphql-application"
  | "nestjs-graphql-module"
  | "nestjs-service-file"
  | "nestjs-service-module"
  | "react-component";

/** Per-rule validation result for a project. */
export interface ValidatorRuleResult {
  errors: string[];
  passed: boolean;
  rule: ValidatorRuleName;
  severity: ValidatorSeverity;
}

/** Severity level for a validation rule violation. */
export type ValidatorSeverity = "error" | "warning";

/** Aggregate validation counts across all projects. */
export interface ValidatorSummary {
  failedProjectCount: number;
  projectCount: number;
  violatedRuleCount: number;
}

/** Workspace project metadata resolved from project.json. */
export interface WorkspaceProject {
  rootPath: string;
  tags: string[];
}
