import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

/** Internal helper. */
export interface MarkdownAbstractSyntaxTreeNode {
  readonly alt?: string;
  readonly children?: MarkdownAbstractSyntaxTreeNode[];
  readonly depth?: number;
  readonly lang?: string;
  readonly ordered?: boolean;
  readonly position?: {
    readonly end?: { readonly line?: number };
  };
  readonly type: string;
  readonly url?: string;
  readonly value?: string;
}

// 🏷️ Types
/** Internal helper. */
export type MarkdownValidatorValidateArguments = Parameters<
  ConformetryValidatorPlugin["validate"]
>[0];

/** Internal helper. */
export type MarkdownValidatorValidateResult = Awaited<
  ReturnType<ConformetryValidatorPlugin["validate"]>
>;

/** Internal helper. */
export interface PickBestCandidateArguments {
  readonly candidates: MarkdownAbstractSyntaxTreeNode[];
  readonly templateGrandchildren: MarkdownAbstractSyntaxTreeNode[];
}

/** Internal helper. */
export interface ProcessNodeArguments {
  readonly instanceChildren: MarkdownAbstractSyntaxTreeNode[];
  readonly lastMatchedInstanceNode: MarkdownAbstractSyntaxTreeNode | undefined;
  readonly templateChild: MarkdownAbstractSyntaxTreeNode;
}

/** Internal helper. */
export interface ProcessNodeResult {
  readonly lastMatched: MarkdownAbstractSyntaxTreeNode | undefined;
  readonly violations: string[];
}

/** Internal helper. */
export interface ValidateMarkdownChildrenArguments {
  readonly instanceChildren: MarkdownAbstractSyntaxTreeNode[];
  readonly templateChildren: MarkdownAbstractSyntaxTreeNode[];
}

/** Internal helper. */
export interface ValidateMarkdownDocumentArguments {
  readonly instance: string;
  readonly renderedTemplate: string;
}

/** Internal helper. */
export interface ValidatePathExistenceArguments {
  readonly filePaths: string[];
  readonly workingDirectory: string;
}
