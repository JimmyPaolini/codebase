// 📤 Exports
export {
  CODEPENDIX_EXPORT_TARGETS,
  CODEPENDIX_GRAPH_TYPES,
  codependixConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  ConfigurationFileNotFoundError,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_INCLUDE_GLOBS,
  DEFAULT_MARKDOWN_PATH,
  REPOSITORY_ROOT_MARKERS,
  UnknownConfigurationFileTypeError,
} from "./modules/configuration/configuration.constants";
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
export {
  CODEPENDIX_RUN_MODES,
  conflictingRunModeError,
  InputError,
  missingInputError,
  promptCancelledError,
} from "./modules/input/input.constants";

export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
export type {
  CodependixRunMode,
  CodependixRunModeOptions,
} from "./modules/input/input.types";
