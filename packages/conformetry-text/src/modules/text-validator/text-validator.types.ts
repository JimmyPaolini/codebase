import type {
  ConformetryValidatorPlugin,
  PreparedValidationDocument,
} from "@jimmypaolini/conformetry-configuration";

/** Internal helper. */
export type TextValidationDocument = PreparedValidationDocument;

// 🏷️ Types
/** Internal helper. */
export type TextValidatorValidateArguments = Parameters<
  ConformetryValidatorPlugin["validate"]
>[0];

/** Internal helper. */
export type TextValidatorValidateResult = Awaited<
  ReturnType<ConformetryValidatorPlugin["validate"]>
>;

/** Internal helper. */
export interface ValidatePathExistenceArguments {
  readonly filePaths: string[];
  readonly workingDirectory: string;
}
