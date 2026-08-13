import path from "node:path";

import { Injectable } from "@nestjs/common";

import { DiscoveryMetadataService } from "./discovery-metadata.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";

import type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
} from "../configuration/configuration.types";
import type {
  CompareCandidatesArguments,
  MatchedGeneratorCandidate,
  ProjectTemplateMetadata,
} from "./discovery.types";

/**
 * Decides which generator's templates govern a given project.
 *
 * A project does not record the template it was generated from beyond an
 * optional `generator:` tag, so the match is inferred. Ranking is deliberately
 * ordered from strongest evidence to weakest, ending in a name comparison so
 * the result is deterministic rather than filesystem-order dependent.
 */
@Injectable()
export class DiscoveryMatchingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryMetadataService: DiscoveryMetadataService,
    private readonly discoveryTemplatesService: DiscoveryTemplatesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Scores a candidate on one boolean signal, higher being better. */
  private scoreCandidate(args: {
    candidate: MatchedGeneratorCandidate;
    inferredGeneratorNames: Set<string>;
    projectMetadata: ProjectTemplateMetadata;
  }): { inferredScore: number; taggedScore: number } {
    return {
      inferredScore: args.inferredGeneratorNames.has(
        args.candidate.generatorName,
      )
        ? 1
        : 0,
      taggedScore:
        args.projectMetadata.generatorName === args.candidate.generatorName
          ? 1
          : 0,
    };
  }

  // 🌎 Public Methods

  /**
   * Orders two candidates, best first.
   *
   * Precedence: an explicit `generator:` tag, then a name inferred from the
   * project directory, then how many template files already exist, then the
   * generator name as a stable tiebreak.
   */
  public compareCandidates(args: CompareCandidatesArguments): number {
    const left = this.scoreCandidate({
      candidate: args.leftCandidate,
      inferredGeneratorNames: args.inferredGeneratorNames,
      projectMetadata: args.projectMetadata,
    });
    const right = this.scoreCandidate({
      candidate: args.rightCandidate,
      inferredGeneratorNames: args.inferredGeneratorNames,
      projectMetadata: args.projectMetadata,
    });

    if (left.taggedScore !== right.taggedScore) {
      return right.taggedScore - left.taggedScore;
    }

    if (left.inferredScore !== right.inferredScore) {
      return right.inferredScore - left.inferredScore;
    }

    if (
      args.leftCandidate.existingFileCount !==
      args.rightCandidate.existingFileCount
    ) {
      return (
        args.rightCandidate.existingFileCount -
        args.leftCandidate.existingFileCount
      );
    }

    return args.leftCandidate.generatorName.localeCompare(
      args.rightCandidate.generatorName,
    );
  }

  /**
   * Builds a candidate for one generator, or `undefined` when its template
   * directory holds no files.
   */
  public createCandidate(args: {
    definition: ConformetryGeneratorDefinition;
    generatorName: string;
    projectPath: string;
    substitutions: Record<string, string>;
    workingDirectory: string;
  }): MatchedGeneratorCandidate | undefined {
    const absoluteTemplateDirectoryPath = path.resolve(
      args.workingDirectory,
      args.definition.templateDirectoryPath,
    );
    const templateFilePaths =
      this.discoveryTemplatesService.collectTemplateFilePaths(
        absoluteTemplateDirectoryPath,
      );

    if (templateFilePaths.length === 0) {
      return undefined;
    }

    return {
      absoluteTemplateDirectoryPath,
      existingFileCount: this.discoveryTemplatesService.countExistingFiles({
        projectPath: args.projectPath,
        substitutions: args.substitutions,
        templateDirectoryPath: absoluteTemplateDirectoryPath,
        templateFilePaths,
      }),
      generatorName: args.generatorName,
      substitutions: args.substitutions,
      templateFilePaths,
    };
  }

  /** Guesses generator names from the project directory name. */
  public inferGeneratorNames(args: {
    generatorNames: string[];
    projectPath: string;
  }): Set<string> {
    const projectDirectoryName = path.basename(args.projectPath).toLowerCase();

    return new Set(
      args.generatorNames.filter((generatorName) => {
        return projectDirectoryName.includes(generatorName.toLowerCase());
      }),
    );
  }

  /**
   * Picks the generator that best explains a project, or `undefined` when no
   * template has a single file in common with it.
   */
  public resolveBestCandidate(args: {
    configuration: ConformetryConfiguration;
    generatorNames: string[];
    projectPath: string;
    workingDirectory: string;
  }): MatchedGeneratorCandidate | undefined {
    const projectMetadata = this.discoveryMetadataService.readProjectMetadata(
      args.projectPath,
    );
    const inferredGeneratorNames = this.inferGeneratorNames({
      generatorNames: args.generatorNames,
      projectPath: args.projectPath,
    });

    if (projectMetadata.generatorName !== undefined) {
      inferredGeneratorNames.add(projectMetadata.generatorName);
    }

    const substitutions = this.discoveryMetadataService.buildSubstitutions({
      projectMetadata,
      projectPath: args.projectPath,
      workingDirectory: args.workingDirectory,
    });

    return args.generatorNames
      .map((generatorName) => {
        const definition = args.configuration.generators[generatorName];

        return definition === undefined
          ? undefined
          : this.createCandidate({
              definition,
              generatorName,
              projectPath: args.projectPath,
              substitutions,
              workingDirectory: args.workingDirectory,
            });
      })
      .filter((candidate) => candidate !== undefined)
      .filter((candidate) => candidate.existingFileCount > 0)
      .toSorted((leftCandidate, rightCandidate) => {
        return this.compareCandidates({
          inferredGeneratorNames,
          leftCandidate,
          projectMetadata,
          rightCandidate,
        });
      })[0];
  }
}
