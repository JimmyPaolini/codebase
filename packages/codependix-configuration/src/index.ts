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
  CodependixBoundariesConfiguration,
  CodependixBoundaryAccessRule,
  CodependixBoundaryAcyclicRule,
  CodependixBoundaryEdgeSelector,
  CodependixBoundaryRule,
  CodependixBoundarySelector,
  CodependixConfiguration,
  CodependixExportTarget,
  CodependixGraphOutput,
  CodependixGraphType,
  CodependixJsonOutput,
  CodependixMarkdownOutput,
  CodependixProjectConfiguration,
  CodependixSelectionArguments,
  CodependixWorkspaceConfiguration,
  LoadConfigurationArguments,
  ProjectSelectionArguments,
  ResolvedCodependixBoundariesConfiguration,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
  ResolvedCodependixJsonOutput,
  ResolvedCodependixMarkdownOutput,
  ResolvedCodependixSelection,
  ResolveForProjectArguments,
} from "./modules/configuration/configuration.types";
export {
  InputError,
  missingInputError,
  promptCancelledError,
} from "./modules/input/input.constants";
export { InputModule } from "./modules/input/input.module";
export { InputService } from "./modules/input/input.service";
