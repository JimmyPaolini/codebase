// 🏷️ Types

/** Arguments accepted when discovering the files to measure. */
export interface DiscoverFilesArguments {
  exclude: string[];
  excludeFrom: string[];
  workingDirectory: string;
}

/** Categorized lists of file paths (relative to the working directory) discovered in a git repository. */
export interface DiscoveryResult {
  jsFiles: string[];
  jsonFiles: string[];
  markdownFiles: string[];
  notebookFiles: string[];
  pyFiles: string[];
  sourceFiles: string[];
  testFiles: string[];
  trackedFiles: string[];
  tsFiles: string[];
}
