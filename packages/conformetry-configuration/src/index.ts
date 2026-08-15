// 📤 Exports
export { UnknownConfigurationFileTypeError } from "./modules/configuration/configuration.constants";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryGeneratorInputDefinition,
  ConformetryInstanceGroup,
  JsonSchemaDefinition,
} from "./modules/configuration/configuration.types";
export { DiscoveryCandidatesService } from "./modules/discovery/discovery-candidates.service";
export { DiscoveryMatchingService } from "./modules/discovery/discovery-matching.service";
export { DiscoveryTemplatesService } from "./modules/discovery/discovery-templates.service";
export { DiscoveryModule } from "./modules/discovery/discovery.module";
export { DiscoveryService } from "./modules/discovery/discovery.service";
export type {
  InstanceCandidate,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolveCandidatesArguments,
  ResolvedInstances,
  TemplateDefinition,
  UnmatchedInstance,
  UnmatchedReason,
} from "./modules/discovery/discovery.types";
export { InputOptionsService } from "./modules/input/input-options.service";
export { InputPromptingService } from "./modules/input/input-prompting.service";
export { InputSchemaService } from "./modules/input/input-schema.service";
export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
export type {
  ResolveGeneratorInputsArguments,
  ResolveInputsFromValuesArguments,
} from "./modules/input/input.types";
