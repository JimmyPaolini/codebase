import path from "node:path";

import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";

import { prepareDocumentsForProjectPath } from "./template-validation-preparation.utilities.js";

import type {
  PreparedValidationDocument,
  PreparedValidationPayload,
} from "./validation.types.js";
import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

/**
 * Arguments for template-aware validation preparation.
 */
export interface PrepareTemplateValidationPayloadArguments {
  configurationPath: string;
  fileExtensions: string[];
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
}

/**
 * Prepares rendered template-instance documents for language validators.
 */
export async function prepareTemplateValidationPayload(
  args: PrepareTemplateValidationPayloadArguments,
): Promise<PreparedValidationPayload> {
  const configurationService = new ConfigurationService();
  const configuration = await configurationService.loadConformetryConfiguration(
    args.configurationPath,
  );
  const selectedGeneratorNames = resolveSelectedGeneratorNames(
    args.templateRuleNames === undefined
      ? { configuration }
      : {
          configuration,
          templateRuleNames: args.templateRuleNames,
        },
  );

  const preparedValidationDocuments: PreparedValidationDocument[] = [];
  const violations: string[] = [];

  for (const rawProjectPath of args.filePaths) {
    const projectPath = path.resolve(args.workingDirectory, rawProjectPath);
    const preparedProject = prepareDocumentsForProjectPath({
      configuration,
      fileExtensions: args.fileExtensions,
      projectPath,
      selectedGeneratorNames,
      workingDirectory: args.workingDirectory,
    });

    preparedValidationDocuments.push(...preparedProject.documents);
    violations.push(...preparedProject.violations);
  }

  return {
    checkedPaths: args.filePaths,
    documents: preparedValidationDocuments,
    violations,
  };
}

/**
 * Resolves selected generator names from optional template rule names.
 */
function resolveSelectedGeneratorNames(args: {
  configuration: ConformetryConfiguration;
  templateRuleNames?: string[];
}): string[] {
  const configuredGeneratorNames = Object.keys(args.configuration.generators);

  if (
    args.templateRuleNames === undefined ||
    args.templateRuleNames.length === 0
  ) {
    return configuredGeneratorNames;
  }

  const selectedGeneratorNames = configuredGeneratorNames.filter(
    (generatorName) => args.templateRuleNames?.includes(generatorName),
  );

  return selectedGeneratorNames;
}
