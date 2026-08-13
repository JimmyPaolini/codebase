// 🏷️ Types

/** Inputs for ranking two candidate generators against each other. */
export interface CompareCandidatesArguments {
  readonly inferredGeneratorNames: Set<string>;
  readonly leftCandidate: MatchedGeneratorCandidate;
  readonly projectMetadata: ProjectTemplateMetadata;
  readonly rightCandidate: MatchedGeneratorCandidate;
}

/** A file a project's matched template requires it to have. */
export interface ExpectedFile {
  readonly instanceFilePath: string;
  readonly projectPath: string;
  readonly templateFilePath: string;
}

/** One generator that could govern a project, with its match evidence. */
export interface MatchedGeneratorCandidate {
  readonly absoluteTemplateDirectoryPath: string;
  /** How many of this template's files already exist in the project. */
  readonly existingFileCount: number;
  readonly generatorName: string;
  readonly substitutions: Record<string, string>;
  readonly templateFilePaths: string[];
}

/** The `project.json` fields discovery reads. */
export interface ParsedProjectMetadata {
  sourceRoot?: string;
  tags?: string[];
}

/** Arguments for preparing the documents of one validation run. */
export interface PrepareValidationPayloadArguments {
  readonly configurationPath: string;
  readonly fileExtensions: string[];
  readonly projectPaths: string[];
  readonly templateRuleNames?: string[];
  readonly workingDirectory: string;
}

/** What discovery learned about a project before matching it to a template. */
export interface ProjectTemplateMetadata {
  description?: string;
  /** Set when the project declares a `generator:<name>` tag. */
  generatorName?: string;
  type?: string;
}

/** Arguments for listing the files a project's template requires. */
export interface ResolveExpectedFilesArguments {
  readonly configurationPath: string;
  readonly projectPaths: string[];
  readonly templateRuleNames?: string[];
  readonly workingDirectory: string;
}
