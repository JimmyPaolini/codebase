import path from "node:path";

import { DefaultTemplateRenderer } from "@jimmypaolini/conformetry-generation";

import {
  collectTemplateFilePaths,
  compareMatchedCandidates,
  countExistingTemplateMappedFiles,
  createTemplateSubstitutions,
  prepareDocumentForTemplateFile,
  resolveProjectTemplateMetadata,
  validateProjectPath,
} from "./template-validation-preparation-metadata.utilities.js";

import type { MatchedGeneratorCandidate } from "./template-validation-preparation.types.js";
import type { PreparedValidationDocument } from "./validation.types.js";
import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

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
  const projectPathViolations = validateProjectPath(args.projectPath);
  if (projectPathViolations.length > 0) {
    return {
      documents: [],
      violations: projectPathViolations,
    };
  }

  const matchedCandidate = resolveBestMatchedGeneratorCandidate({
    configuration: args.configuration,
    projectPath: args.projectPath,
    selectedGeneratorNames: args.selectedGeneratorNames,
    workingDirectory: args.workingDirectory,
  });
  if (matchedCandidate === undefined) {
    return {
      documents: [],
      violations: [],
    };
  }

  return prepareDocumentsForGenerator({
    fileExtensions: args.fileExtensions,
    generatorCandidate: matchedCandidate,
    projectPath: args.projectPath,
  });
}

/**
 * Creates one candidate from generator definition and project mapping.
 */
function createMatchedGeneratorCandidate(args: {
  configuration: ConformetryConfiguration;
  generatorName: string;
  projectPath: string;
  substitutions: Record<string, string>;
  workingDirectory: string;
}): MatchedGeneratorCandidate | undefined {
  const generatorDefinition = args.configuration.generators[args.generatorName];
  if (generatorDefinition === undefined) {
    return undefined;
  }

  const absoluteTemplateDirectoryPath = path.resolve(
    args.workingDirectory,
    generatorDefinition.templateDirectoryPath,
  );
  const templateFilePaths = collectTemplateFilePaths(
    absoluteTemplateDirectoryPath,
  );
  if (templateFilePaths.length === 0) {
    return undefined;
  }

  const existingFileCount = countExistingTemplateMappedFiles({
    absoluteTemplateDirectoryPath,
    projectPath: args.projectPath,
    substitutions: args.substitutions,
    templateFilePaths,
  });

  return {
    absoluteTemplateDirectoryPath,
    existingFileCount,
    generatorName: args.generatorName,
    substitutions: args.substitutions,
    templateFilePaths,
  };
}

/**
 * Infers likely generator names from the project directory name.
 */
function inferGeneratorNamesFromProjectPath(args: {
  configuredGeneratorNames: string[];
  projectPath: string;
}): Set<string> {
  const projectDirectoryName = path.basename(args.projectPath).toLowerCase();
  const inferredGeneratorNames = args.configuredGeneratorNames.filter(
    (generatorName) =>
      projectDirectoryName.includes(generatorName.toLowerCase()),
  );

  return new Set(inferredGeneratorNames);
}

/**
 * Prepares documents for one matched generator candidate.
 */
function prepareDocumentsForGenerator(args: {
  fileExtensions: string[];
  generatorCandidate: MatchedGeneratorCandidate;
  projectPath: string;
}): {
  documents: PreparedValidationDocument[];
  violations: string[];
} {
  const absoluteTemplateDirectoryPath =
    args.generatorCandidate.absoluteTemplateDirectoryPath;
  const templateRenderer = new DefaultTemplateRenderer();
  const extensionSet = new Set(args.fileExtensions);
  const documents: PreparedValidationDocument[] = [];
  const violations: string[] = [];

  for (const templateFilePath of args.generatorCandidate.templateFilePaths) {
    const documentPreparation = prepareDocumentForTemplateFile({
      extensionSet,
      generatorCandidate: args.generatorCandidate,
      projectPath: args.projectPath,
      templateFilePath,
      templateRenderer,
      templateRootPath: absoluteTemplateDirectoryPath,
    });

    if (documentPreparation === undefined) {
      continue;
    }

    if ("violation" in documentPreparation) {
      violations.push(documentPreparation.violation);
      continue;
    }

    documents.push(documentPreparation.document);
  }

  return {
    documents,
    violations,
  };
}

/**
 * Resolves the best matching template generator for a project path.
 */
function resolveBestMatchedGeneratorCandidate(args: {
  configuration: ConformetryConfiguration;
  projectPath: string;
  selectedGeneratorNames: string[];
  workingDirectory: string;
}): MatchedGeneratorCandidate | undefined {
  const projectTemplateMetadata = resolveProjectTemplateMetadata(
    args.projectPath,
  );
  const inferredGeneratorNames = inferGeneratorNamesFromProjectPath({
    configuredGeneratorNames: args.selectedGeneratorNames,
    projectPath: args.projectPath,
  });
  if (projectTemplateMetadata.generatorName !== undefined) {
    inferredGeneratorNames.add(projectTemplateMetadata.generatorName);
  }

  const substitutions = createTemplateSubstitutions({
    projectPath: args.projectPath,
    projectTemplateMetadata,
    workingDirectory: args.workingDirectory,
  });
  const candidates = args.selectedGeneratorNames
    .map((generatorName) => {
      return createMatchedGeneratorCandidate({
        configuration: args.configuration,
        generatorName,
        projectPath: args.projectPath,
        substitutions,
        workingDirectory: args.workingDirectory,
      });
    })
    .filter((candidate) => candidate !== undefined);

  const sortedCandidates = candidates
    .filter((candidate) => candidate.existingFileCount > 0)
    .toSorted((leftCandidate, rightCandidate) => {
      return compareMatchedCandidates({
        inferredGeneratorNames,
        leftCandidate,
        projectTemplateMetadata,
        rightCandidate,
      });
    });

  return sortedCandidates[0];
}
