/**
 * Arguments used to resolve routed template rules and project paths.
 */
export interface ResolveTemplateRuleRoutingArguments {
  configuredTemplateRuleNames: string[];
  projectSelectors: string[];
  requestedTemplateRuleNames?: string[];
  workingDirectory: string;
}

/**
 * Routing result consumed by validation command flow.
 */
export interface ResolveTemplateRuleRoutingResult {
  projectPaths: string[];
  templateRuleNames: string[];
}

/**
 * Workspace project metadata used for rule routing.
 */
export interface WorkspaceProjectMetadata {
  name: string;
  rootPath: string;
  sourceRoot: string;
  tags: string[];
}
