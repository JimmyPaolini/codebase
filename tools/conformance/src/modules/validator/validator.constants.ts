// ♟️ Constants
import {
  APPLICATIONS_DIRECTORY,
  PACKAGES_DIRECTORY,
  TOOLS_DIRECTORY,
} from "../../constants";

import type { ValidatorRuleName } from "./validator.types";

export const TODO_LINE_REGEX = /\bTODO\b/u;

export const DEFAULT_PROJECT_DIRECTORIES = [
  APPLICATIONS_DIRECTORY,
  PACKAGES_DIRECTORY,
  TOOLS_DIRECTORY,
] as const;

export const VALIDATOR_RULE_NAMES: ValidatorRuleName[] = [
  "jupyter-notebook-application",
  "nestjs-command-application",
  "nestjs-command-module",
  "nestjs-dataloader-module",
  "nestjs-graphql-application",
  "nestjs-graphql-module",
  "react-component",
  "nestjs-service-file",
  "nestjs-service-module",
];

/** Type guard for validation rule names. */
export function isValidatorRuleName(value: string): value is ValidatorRuleName {
  for (const validatorRuleName of VALIDATOR_RULE_NAMES) {
    if (validatorRuleName === value) {
      return true;
    }
  }

  return false;
}
