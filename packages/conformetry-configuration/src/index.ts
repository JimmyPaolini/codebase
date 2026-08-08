export { ConfigurationModule } from "./modules/configuration/configuration.module.js";
export { ConfigurationService } from "./modules/configuration/configuration.service.js";
export type {
  CompareMatchedCandidatesArguments,
  CollectGeneratorInputsFromCommandArgumentsArguments,
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorHookDefinition,
  ConformetryGeneratorParameterDefinition,
  ConformetryNxPluginOptions,
  ConformetryValidatorPlugin,
  ConformetryPluginOptions,
  JsonSchemaDefinition,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  ParsedConformetryGeneratorDefinition,
  PreparedValidationDocument,
  PreparedValidationPayload,
  PrepareTemplateValidationPayloadArguments,
  ResolveConfigurationPathArguments,
  ResolveProjectRootPathArguments,
  ResolveTargetDirectoryPathArguments,
  RunValidationArguments,
  RunValidationResult,
  ValidationPluginArguments,
  ValidationPluginDescriptor,
  ValidationPluginResult,
  ValidationProjectTemplateMetadata,
} from "./modules/configuration/configuration.types.js";
export {
  buildNameSubstitutions,
  collectGeneratorInputsFromCommandArguments,
  normalizeRuntimeOptions,
  parseCommaDelimitedOption,
  resolveConfigurationPath,
  resolveTargetDirectoryPath,
} from "./modules/configuration/configuration.utilities.js";
export { prepareTemplateValidationPayload } from "./modules/configuration/configuration-template-validation.utilities.js";
