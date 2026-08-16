// 🏷️ Types

/** Categorized lists of file paths (relative to the working directory) discovered in a git repository. */
export interface DiscoveryResult {
  jsFiles: string[];
  jsonFiles: string[];
  pyFiles: string[];
  sourceFiles: string[];
  testFiles: string[];
  trackedFiles: string[];
  tsFiles: string[];
}
