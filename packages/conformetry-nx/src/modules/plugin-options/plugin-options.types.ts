// 🏷️ Types

/**
 * Shared conformetry plugin options accepted by Nx integration.
 */
export interface ConformetryNxPluginOptions {
  configFilePath?: string;
  templateRuleNamesByProjectTag?: TemplateRuleNamesByProjectTag;
}

/**
 * Plugin options accepted from nx.json plugin registration.
 */
export interface ConformetryNxPluginRegistrationOptions extends ConformetryNxPluginOptions {
  validationTargetName?: string;
}

/**
 * Maps project tags to conformetry template rule names.
 */
export type TemplateRuleNamesByProjectTag = Readonly<
  Record<string, readonly string[]>
>;
