export { ConfigurationModule } from "./modules/configuration/configuration.module.js";
export { ConfigurationService } from "./modules/configuration/configuration.service.js";
export { prepareTemplateValidationPayload } from "./modules/template-validation/template-validation-preparation.js";
export type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorHookDefinition,
  ConformetryGeneratorParameterDefinition,
  ParsedConformetryGeneratorDefinition,
} from "./modules/configuration/configuration.types.js";
export type {
  CompareMatchedCandidatesArguments,
  ConformetryValidatorPlugin,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  PrepareTemplateValidationPayloadArguments,
  PreparedValidationDocument,
  PreparedValidationPayload,
  RunValidationArguments,
  RunValidationResult,
  ValidationPluginArguments,
  ValidationPluginDescriptor,
  ValidationPluginResult,
  ValidationProjectTemplateMetadata,
} from "./modules/template-validation/template-validation.types.js";
