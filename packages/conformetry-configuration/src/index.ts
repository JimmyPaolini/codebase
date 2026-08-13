// 📤 Exports
export { TemplateValidationService } from "./modules/configuration/configuration-template-validation.service";
export { prepareTemplateValidationPayload } from "./modules/configuration/configuration-template-validation.utilities";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  CollectGeneratorInputsFromCommandArgumentsArguments,
  CompareMatchedCandidatesArguments,
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorHookDefinition,
  ConformetryGeneratorParameterDefinition,
  ConformetryNxPluginOptions,
  ConformetryPluginOptions,
  ConformetryValidatorPlugin,
  JsonSchemaDefinition,
  MatchedGeneratorCandidate,
  ParsedConformetryGeneratorDefinition,
  ParsedProjectMetadata,
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
} from "./modules/configuration/configuration.types";
export {
  buildNameSubstitutions,
  collectGeneratorInputsFromCommandArguments,
  normalizeRuntimeOptions,
  resolveConfigurationPath,
  resolveTargetDirectoryPath,
} from "./modules/configuration/configuration.utilities";
export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
export type { ResolveGeneratorInputsArguments } from "./modules/input/input.types";
