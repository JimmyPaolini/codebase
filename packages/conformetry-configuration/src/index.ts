// 📤 Exports
export { UnknownConfigurationFileTypeError } from "./modules/configuration/configuration.constants";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ConformetryNxPluginOptions,
  JsonSchemaDefinition,
} from "./modules/configuration/configuration.types";
export { DiscoveryMatchingService } from "./modules/discovery/discovery-matching.service";
export { DiscoveryMetadataService } from "./modules/discovery/discovery-metadata.service";
export { DiscoveryTemplatesService } from "./modules/discovery/discovery-templates.service";
export { DiscoveryModule } from "./modules/discovery/discovery.module";
export { DiscoveryService } from "./modules/discovery/discovery.service";
export type {
  ExpectedFile,
  PrepareValidationPayloadArguments,
  ResolveExpectedFilesArguments,
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
