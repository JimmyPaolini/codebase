import { TemplateValidationService } from "./configuration-template-validation.service.js";
import { ConfigurationService } from "./configuration.service.js";

import type {
  CompareMatchedCandidatesArguments,
  ConformetryConfiguration,
  PreparedValidationDocument,
  PreparedValidationPayload,
  PrepareTemplateValidationPayloadArguments,
  ValidationProjectTemplateMetadata,
} from "./configuration.types.js";

function getTemplateValidationService(): TemplateValidationService {
  return new TemplateValidationService(new ConfigurationService());
}

/**
 * Replaces template placeholders with generated substitutions.
 */
export function applySubstitutions(
  value: string,
  substitutions: Record<string, string>,
): string {
  return getTemplateValidationService().applySubstitutions(value, substitutions);
}

/**
 * Collects file paths for every template file under a directory.
 */
export function collectTemplateFilePaths(templateDirectoryPath: string): string[] {
  return getTemplateValidationService().collectTemplateFilePaths(
    templateDirectoryPath,
  );
}

/**
 * Compares candidate ranking values and selects the better one.
 */
export function compareMatchedCandidates(
  args: CompareMatchedCandidatesArguments,
): number {
  return getTemplateValidationService().compareMatchedCandidates(args);
}

/**
 * Counts mapped template files that already exist in the project path.
 */
export function countExistingTemplateMappedFiles(args: {
  absoluteTemplateDirectoryPath: string;
  projectPath: string;
  substitutions: Record<string, string>;
  templateFilePaths: string[];
}): number {
  return getTemplateValidationService().countExistingTemplateMappedFiles(args);
}

/**
 * Builds substitutions used to render template paths and content.
 */
export function createTemplateSubstitutions(args: {
  projectPath: string;
  projectTemplateMetadata: ValidationProjectTemplateMetadata;
  workingDirectory: string;
}): Record<string, string> {
  return getTemplateValidationService().createTemplateSubstitutions(args);
}

/**
 * Determines whether a directory entry should be included as a template file.
 */
export function isTemplateFile(entryName: string, isFile: boolean): boolean {
  return getTemplateValidationService().isTemplateFile(entryName, isFile);
}

/**
 * Prepares validation documents for a single project path.
 */
export function prepareDocumentsForProjectPath(args: {
  configuration: ConformetryConfiguration;
  fileExtensions: string[];
  projectPath: string;
  selectedGeneratorNames: string[];
  workingDirectory: string;
}): {
  documents: PreparedValidationDocument[];
  violations: string[];
} {
  return getTemplateValidationService().prepareDocumentsForProjectPath(args);
}

/**
 * Prepares rendered template-instance documents for language validators.
 */
export async function prepareTemplateValidationPayload(
  args: PrepareTemplateValidationPayloadArguments,
): Promise<PreparedValidationPayload> {
  return getTemplateValidationService().prepareTemplateValidationPayload(args);
}

/**
 * Validates that the path exists and points to a directory.
 */
export function validateProjectPath(projectPath: string): string[] {
  return getTemplateValidationService().validateProjectPath(projectPath);
}
