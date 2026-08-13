// 🏷️ Types

/** Arguments for checking one project's files against its template. */
export interface CheckProjectFilesArguments {
  readonly configurationPath: string;
  readonly projectPaths: string[];
  readonly templateRuleNames?: string[];
  readonly workingDirectory: string;
}
