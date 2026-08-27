// 📤 Exports
export {
  CODEPENDIX_EXPORT_TARGETS,
  CODEPENDIX_GRAPH_TYPES,
  codependixConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_INCLUDE_GLOBS,
  DEFAULT_MARKDOWN_PATH,
  REPOSITORY_ROOT_MARKERS,
  UnknownConfigurationFileTypeError,
} from "./modules/configuration/configuration.constants";
export { ConfigurationFileNotFoundError } from "./modules/configuration/configuration.errors";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  CodependixConfiguration,
  CodependixExportTarget,
  CodependixGraphOutput,
  CodependixGraphType,
  CodependixJsonOutput,
  CodependixMarkdownOutput,
  CodependixProjectConfiguration,
  CodependixWorkspaceConfiguration,
  LoadConfigurationArguments,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
  ResolvedCodependixJsonOutput,
  ResolvedCodependixMarkdownOutput,
  ResolveForProjectArguments,
} from "./modules/configuration/configuration.types";
export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
