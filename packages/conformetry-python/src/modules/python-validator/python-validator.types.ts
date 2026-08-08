import type {
  ConformetryValidatorPlugin,
  PreparedValidationDocument,
} from "@jimmypaolini/conformetry-configuration";

// 🏷️ Types
/** Internal helper. */
export type JsonValue =
  | boolean
  | JsonValue[]
  | null
  | number
  | string
  | { [key: string]: JsonValue };

/** Internal helper. */
export type PythonValidationDocument = PreparedValidationDocument;

/** Internal helper. */
export type PythonValidatorValidateArguments = Parameters<
  ConformetryValidatorPlugin["validate"]
>[0];

/** Internal helper. */
export type PythonValidatorValidateResult = Awaited<
  ReturnType<ConformetryValidatorPlugin["validate"]>
>;

/** Internal helper. */
export interface ValidateJsonArraysArguments {
  readonly instanceArray: JsonValue[];
  readonly pathSegments: (number | string)[];
  readonly templateArray: JsonValue[];
}

/** Internal helper. */
export interface ValidateJsonDepthFirstSearchArguments {
  readonly instanceValue: JsonValue;
  readonly pathSegments?: (number | string)[];
  readonly templateValue: JsonValue;
}

/** Internal helper. */
export interface ValidateJsonObjectsArguments {
  readonly instanceObject: Record<string, JsonValue>;
  readonly pathSegments: (number | string)[];
  readonly templateObject: Record<string, JsonValue>;
}

/** Internal helper. */
export interface ValidatePathExistenceArguments {
  readonly filePaths: string[];
  readonly workingDirectory: string;
}
