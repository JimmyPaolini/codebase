import type { ValidationProjectTemplateMetadata } from "./validation.types.js";

/**
 * Ranking inputs for candidate comparison.
 */
export interface CompareMatchedCandidatesArguments {
  inferredGeneratorNames: Set<string>;
  leftCandidate: MatchedGeneratorCandidate;
  projectTemplateMetadata: ValidationProjectTemplateMetadata;
  rightCandidate: MatchedGeneratorCandidate;
}

/**
 * Candidate template metadata for one generator.
 */
export interface MatchedGeneratorCandidate {
  absoluteTemplateDirectoryPath: string;
  existingFileCount: number;
  generatorName: string;
  substitutions: Record<string, string>;
  templateFilePaths: string[];
}

/**
 * Parsed project metadata fields used by template preparation.
 */
export interface ParsedProjectMetadata {
  sourceRoot?: string;
  tags?: string[];
}
