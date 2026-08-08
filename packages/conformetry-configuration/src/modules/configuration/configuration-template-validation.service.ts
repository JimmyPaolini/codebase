import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { TemplateValidationOperations } from "./configuration-template-validation.operations.js";
import { TemplateValidationMetadataOperations } from "./configuration-template-validation.metadata.operations.js";
import { ConfigurationService } from "./configuration.service.js";

import type {
  CompareMatchedCandidatesArguments,
  ConformetryConfiguration,
  PreparedValidationDocument,
  PreparedValidationPayload,
  PrepareTemplateValidationPayloadArguments,
  ValidationProjectTemplateMetadata,
} from "./configuration.types.js";

/**
 * Prepares rendered template-instance documents for language validators.
 */
@Injectable()
export class TemplateValidationService {
  private readonly operations = new TemplateValidationOperations();
  private readonly metadataOperations = new TemplateValidationMetadataOperations(
    this.operations,
  );

  public constructor(
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Replaces template placeholders with generated substitutions.
   */
  public applySubstitutions(
    value: string,
    substitutions: Record<string, string>,
  ): string {
    return this.operations.applySubstitutions(value, substitutions);
  }

  /**
   * Collects file paths for every template file under a directory.
   */
  public collectTemplateFilePaths(templateDirectoryPath: string): string[] {
    return this.operations.collectTemplateFilePaths(templateDirectoryPath);
  }

  /**
   * Compares candidate ranking values and selects the better one.
   */
  public compareMatchedCandidates(
    args: CompareMatchedCandidatesArguments,
  ): number {
    return this.operations.compareMatchedCandidates(args);
  }

  /**
   * Counts mapped template files that already exist in the project path.
   */
  public countExistingTemplateMappedFiles(args: {
    absoluteTemplateDirectoryPath: string;
    projectPath: string;
    substitutions: Record<string, string>;
    templateFilePaths: string[];
  }): number {
    return this.operations.countExistingTemplateMappedFiles(args);
  }

  /**
   * Builds substitutions used to render template paths and content.
   */
  public createTemplateSubstitutions(args: {
    projectPath: string;
    projectTemplateMetadata: ValidationProjectTemplateMetadata;
    workingDirectory: string;
  }): Record<string, string> {
    return this.operations.createTemplateSubstitutions(args);
  }

  /**
   * Determines whether a directory entry should be included as a template file.
   */
  public isTemplateFile(entryName: string, isFile: boolean): boolean {
    return this.operations.isTemplateFile(entryName, isFile);
  }

  /**
   * Prepares validation documents for a single project path.
   */
  public prepareDocumentsForProjectPath(args: {
    configuration: ConformetryConfiguration;
    fileExtensions: string[];
    projectPath: string;
    selectedGeneratorNames: string[];
    workingDirectory: string;
  }): {
    documents: PreparedValidationDocument[];
    violations: string[];
  } {
    const projectPathViolations = this.validateProjectPath(args.projectPath);
    if (projectPathViolations.length > 0) {
      return {
        documents: [],
        violations: projectPathViolations,
      };
    }

    const matchedCandidate = this.metadataOperations.resolveBestMatchedGeneratorCandidate({
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

    return this.operations.prepareDocumentsForGenerator({
      fileExtensions: args.fileExtensions,
      generatorCandidate: matchedCandidate,
      projectPath: args.projectPath,
    });
  }

  /**
   * Prepares rendered template-instance documents for language validators.
   */
  public async prepareTemplateValidationPayload(
    args: PrepareTemplateValidationPayloadArguments,
  ): Promise<PreparedValidationPayload> {
    const configuration = await this.configurationService.loadConformetryConfiguration(
      args.configurationPath,
    );
    const selectedGeneratorNames = this.metadataOperations.resolveSelectedGeneratorNames(
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
      const preparedProject = this.prepareDocumentsForProjectPath({
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
   * Validates that the path exists and points to a directory.
   */
  public validateProjectPath(projectPath: string): string[] {
    if (!fs.existsSync(projectPath)) {
      return [`Missing project path ${projectPath}`];
    }

    if (!fs.statSync(projectPath).isDirectory()) {
      return [`Expected a project directory path but found file ${projectPath}`];
    }

    return [];
  }
}
