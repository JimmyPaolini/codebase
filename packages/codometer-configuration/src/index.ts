// 📤 Exports
export {
  codometerConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  UnknownConfigurationFileTypeError,
} from "./modules/configuration/configuration.constants";
export { ConfigurationFileNotFoundError } from "./modules/configuration/configuration.errors";
export { ConfigurationModule } from "./modules/configuration/configuration.module";
export { ConfigurationService } from "./modules/configuration/configuration.service";
export type {
  CodeStatisticsResult,
  CodometerConfiguration,
  CodometerJsonOutputConfiguration,
  CodometerMarkdownOutputConfiguration,
  CodometerOutputConfiguration,
  CodometerPythonConfiguration,
  JavascriptStatistics,
  JsonStatistics,
  JupyterStatistics,
  LoadConfigurationArguments,
  MarkdownAnchorHelpers,
  MarkdownStatistics,
  PythonStatistics,
  RenderMarkdownArguments,
  RenderMarkdownOutput,
  ResolvedCodometerConfiguration,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
  ResolvedCodometerOutputConfiguration,
  ResolvedCodometerPythonConfiguration,
  TypescriptStatistics,
  WriteMarkdownArguments,
  WriteMarkdownOutput,
  YamlStatistics,
} from "./modules/configuration/configuration.types";
