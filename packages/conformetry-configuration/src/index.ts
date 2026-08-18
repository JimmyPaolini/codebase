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
export { InputOptionsService } from "./modules/input/input-options.service";
export { InputPromptingService } from "./modules/input/input-prompting.service";
export { InputSchemaService } from "./modules/input/input-schema.service";
export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
export type {
  ResolveGeneratorInputsArguments,
  ResolveInputsFromValuesArguments,
} from "./modules/input/input.types";
export { TemplateDiscoveryInstancesService } from "./modules/template-discovery/template-discovery-instances.service";
export { TemplateDiscoveryMatchingService } from "./modules/template-discovery/template-discovery-matching.service";
export { TemplateDiscoveryTemplatesService } from "./modules/template-discovery/template-discovery-templates.service";
export { TemplateDiscoveryModule } from "./modules/template-discovery/template-discovery.module";
export { TemplateDiscoveryService } from "./modules/template-discovery/template-discovery.service";
export type {
  FindInstancesArguments,
  Instance,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolvedInstances,
  TemplateDefinition,
  TemplateMatch,
  UnmatchedInstance,
  UnmatchedReason,
} from "./modules/template-discovery/template-discovery.types";
