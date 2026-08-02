import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";
import type { Node, SourceFile } from "typescript";

/** Internal helper. */
export interface ExtractedComment {
  readonly position: number;
  readonly text: string;
}

// 🏷️ Types
/** Internal helper. */
export type TypeScriptValidatorValidateArguments = Parameters<
  ConformetryValidatorPlugin["validate"]
>[0];

/** Internal helper. */
export type TypeScriptValidatorValidateResult = Awaited<
  ReturnType<ConformetryValidatorPlugin["validate"]>
>;

/** Internal helper. */
export interface ValidateCommentsArguments {
  readonly instanceSourceFile: SourceFile;
  readonly templateSourceFile: SourceFile;
}

/** Internal helper. */
export interface ValidateDepthFirstSearchArguments {
  readonly instanceNode: Node;
  readonly templateNode: Node;
}

/** Internal helper. */
export interface ValidatePathExistenceArguments {
  readonly filePaths: string[];
  readonly workingDirectory: string;
}
