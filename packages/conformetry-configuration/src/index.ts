export { ConfigurationModule } from "./modules/configuration/configuration.module.js";
export { ConfigurationService } from "./modules/configuration/configuration.service.js";
export type {
  CollectGeneratorInputsFromCommandArgumentsArguments,
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorHookDefinition,
  ConformetryGeneratorParameterDefinition,
  ConformetryNxPluginOptions,
  ConformetryPluginOptions,
  JsonSchemaDefinition,
  ParsedConformetryGeneratorDefinition,
  ResolveConfigurationPathArguments,
  ResolveProjectRootPathArguments,
  ResolveTargetDirectoryPathArguments,
} from "./modules/configuration/configuration.types.js";
export {
  buildNameSubstitutions,
  collectGeneratorInputsFromCommandArguments,
  normalizeRuntimeOptions,
  resolveConfigurationPath,
  resolveTargetDirectoryPath,
} from "./modules/configuration/configuration.utilities.js";
export { prepareTemplateValidationPayload } from "./modules/template-validation/template-validation-preparation.js";
export type {
  CompareMatchedCandidatesArguments,
  ConformetryValidatorPlugin,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  PreparedValidationDocument,
  PreparedValidationPayload,
  PrepareTemplateValidationPayloadArguments,
  RunValidationArguments,
  RunValidationResult,
  ValidationPluginArguments,
  ValidationPluginDescriptor,
  ValidationPluginResult,
  ValidationProjectTemplateMetadata,
} from "./modules/template-validation/template-validation.types.js";
