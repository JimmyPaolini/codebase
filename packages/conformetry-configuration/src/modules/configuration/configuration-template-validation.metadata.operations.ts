import fs from "node:fs";
import path from "node:path";

import { TemplateValidationOperations } from "./configuration-template-validation.operations.js";

import type {
  ConformetryConfiguration,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  ValidationProjectTemplateMetadata,
} from "./configuration.types.js";

/**
 * Shared metadata and selection helpers for template validation.
 */
export class TemplateValidationMetadataOperations {
  public constructor(
    private readonly operations: TemplateValidationOperations,
  ) {}

  /**
   * Parses project metadata content into a plain record.
   */
  public parseProjectMetadataRecord(
    projectMetadataContent: string,
  ): ParsedProjectMetadata | undefined {
    let parsedProjectMetadata: unknown;
    try {
      parsedProjectMetadata = JSON.parse(projectMetadataContent) as unknown;
    } catch {
      return undefined;
    }

    if (
      typeof parsedProjectMetadata !== "object" ||
      parsedProjectMetadata === null
    ) {
      return undefined;
    }

    const parsedProjectMetadataRecord = parsedProjectMetadata as {
      sourceRoot?: unknown;
      tags?: unknown;
    };
    const sourceRoot =
      typeof parsedProjectMetadataRecord.sourceRoot === "string"
        ? parsedProjectMetadataRecord.sourceRoot
        : undefined;
    const rawTags = this.toUnknownArray(parsedProjectMetadataRecord.tags);
    const tags: string[] | undefined = rawTags?.flatMap((tagValue) => {
      return typeof tagValue === "string" ? [tagValue] : [];
    });

    const parsedProjectMetadataResult: ParsedProjectMetadata = {};
    if (sourceRoot !== undefined) {
      parsedProjectMetadataResult.sourceRoot = sourceRoot;
    }
    if (tags !== undefined) {
      parsedProjectMetadataResult.tags = tags;
    }

    return parsedProjectMetadataResult;
  }

  /**
   * Resolves the best matching template generator for a project path.
   */
  public resolveBestMatchedGeneratorCandidate(args: {
    configuration: ConformetryConfiguration;
    projectPath: string;
    selectedGeneratorNames: string[];
    workingDirectory: string;
  }): MatchedGeneratorCandidate | undefined {
    const projectTemplateMetadata = this.resolveProjectTemplateMetadata(
      args.projectPath,
    );
    const inferredGeneratorNames = this.operations.inferGeneratorNamesFromProjectPath({
      configuredGeneratorNames: args.selectedGeneratorNames,
      projectPath: args.projectPath,
    });
    if (projectTemplateMetadata.generatorName !== undefined) {
      inferredGeneratorNames.add(projectTemplateMetadata.generatorName);
    }

    const substitutions = this.operations.createTemplateSubstitutions({
      projectPath: args.projectPath,
      projectTemplateMetadata,
      workingDirectory: args.workingDirectory,
    });
    const candidates = args.selectedGeneratorNames
      .map((generatorName) => {
        return this.operations.createMatchedGeneratorCandidate({
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
        return this.operations.compareMatchedCandidates({
          inferredGeneratorNames,
          leftCandidate,
          projectTemplateMetadata,
          rightCandidate,
        });
      });

    return sortedCandidates[0];
  }

  /**
   * Resolves a generator tag from project metadata tags.
   */
  public resolveGeneratorNameFromTags(
    projectMetadataRecord: ParsedProjectMetadata,
  ): string | undefined {
    if (projectMetadataRecord.tags === undefined) {
      return undefined;
    }

    for (const tag of projectMetadataRecord.tags) {
      if (!tag.startsWith("generator:")) {
        continue;
      }

      const generatorName = tag.slice("generator:".length).trim();
      if (generatorName.length > 0) {
        return generatorName;
      }
    }

    return undefined;
  }

  /**
   * Resolves project description from pyproject.toml, when present.
   */
  public resolveProjectDescription(projectPath: string): string {
    const pyprojectPath = path.join(projectPath, "pyproject.toml");
    if (!fs.existsSync(pyprojectPath)) {
      return "";
    }

    const pyprojectFileContent = fs.readFileSync(pyprojectPath, "utf8");
    const descriptionMatch =
      /^description\s*=\s*["'](?<description>.*)["']$/mu.exec(
        pyprojectFileContent,
      );

    const description = descriptionMatch?.groups?.["description"];
    return description === undefined ? "" : description;
  }

  /**
   * Resolves metadata-driven template context values for a project path.
   */
  public resolveProjectTemplateMetadata(
    projectPath: string,
  ): ValidationProjectTemplateMetadata {
    const projectMetadata: ValidationProjectTemplateMetadata = {
      description: this.resolveProjectDescription(projectPath),
    };
    const projectMetadataPath = path.join(projectPath, "project.json");
    if (!fs.existsSync(projectMetadataPath)) {
      return projectMetadata;
    }

    const projectMetadataContent = fs.readFileSync(projectMetadataPath, "utf8");
    const projectMetadataRecord = this.parseProjectMetadataRecord(
      projectMetadataContent,
    );
    if (projectMetadataRecord === undefined) {
      return projectMetadata;
    }

    const sourceRootType = this.resolveSourceRootType(projectMetadataRecord);
    if (sourceRootType !== undefined) {
      projectMetadata.type = sourceRootType;
    }

    const generatorName = this.resolveGeneratorNameFromTags(projectMetadataRecord);
    if (generatorName !== undefined) {
      projectMetadata.generatorName = generatorName;
    }

    return projectMetadata;
  }

  /**
   * Resolves a stable project type for substitution rendering.
   */
  public resolveProjectType(args: {
    projectPath: string;
    projectTemplateMetadata: ValidationProjectTemplateMetadata;
    workingDirectory: string;
  }): string {
    if (args.projectTemplateMetadata.type !== undefined) {
      return args.projectTemplateMetadata.type;
    }

    const relativeProjectPath = path.relative(
      args.workingDirectory,
      args.projectPath,
    );
    const relativePathSegment = relativeProjectPath
      .split(path.sep)
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);

    return relativePathSegment ?? "applications";
  }

  /**
   * Resolves selected generator names from optional template rule names.
   */
  public resolveSelectedGeneratorNames(args: {
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

  /**
   * Resolves sourceRoot-derived type from parsed project metadata.
   */
  public resolveSourceRootType(
    projectMetadataRecord: ParsedProjectMetadata,
  ): string | undefined {
    if (projectMetadataRecord.sourceRoot === undefined) {
      return undefined;
    }

    return projectMetadataRecord.sourceRoot
      .split(/[\\/]/u)
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);
  }

  /**
   * Narrows unknown input into a readonly unknown array.
   */
  public toUnknownArray(value: unknown): readonly unknown[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value as readonly unknown[];
  }
}
