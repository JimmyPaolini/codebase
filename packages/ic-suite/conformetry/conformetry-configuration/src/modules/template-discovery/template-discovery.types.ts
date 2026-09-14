// 🏷️ Types

/** One template: a directory of mustache files under the templates root. */
export interface TemplateDefinition {
  /** Absolute path to the template's own directory. */
  readonly directoryPath: string;
  /** Absolute paths of every file in the template, sorted. */
  readonly filePaths: string[];
  /** The template's directory name, used to identify it. */
  readonly name: string;
  /**
   * Lowest conformance score an instance of this template may have, from the
   * generator that owns it. Undefined when the generator sets none.
   */
  readonly threshold?: number;
}
