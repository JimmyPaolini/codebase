// 📤 Exports
export {
  CODEPENDIX_EXPORT_TARGETS,
  CODEPENDIX_GRAPH_TYPES,
  codependixConfigurationSchema,
  codependixProjectConfigurationSchema,
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
  CodependixConfigurationOverrides,
  CodependixExportTarget,
  CodependixFileImportsBoundariesConfiguration,
  CodependixGraphOutput,
  CodependixGraphType,
  CodependixJsonOutput,
  CodependixMarkdownOutput,
  CodependixProjectConfiguration,
  CodependixSelectionArguments,
  CodependixWorkspaceConfiguration,
  LoadConfigurationArguments,
  LoadProjectConfigurationArguments,
  ProjectSelectionArguments,
  ResolvedCodependixBoundariesConfiguration,
  ResolvedCodependixConfiguration,
  ResolvedCodependixFileImportsBoundariesConfiguration,
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
export { OverrideResolutionModule } from "./modules/override-resolution/override-resolution.module";
export { OverrideResolutionService } from "./modules/override-resolution/override-resolution.service";
export type { ApplyOverridesArguments } from "./modules/override-resolution/override-resolution.types";
