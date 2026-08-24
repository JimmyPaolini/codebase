// 📤 Exports

export { DocumentsModule } from "./modules/documents/documents.module";
export { DocumentsService } from "./modules/documents/documents.service";
export type {
  DocumentDestination,
  DocumentMarkers,
  EmitArguments,
} from "./modules/documents/documents.types";
export { JsonModule } from "./modules/json/json.module";
export { JsonService } from "./modules/json/json.service";
export type {
  RenderReportArguments,
  SyncJsonArguments,
} from "./modules/json/json.types";
export { MissingMarkdownPathError } from "./modules/markdown/markdown.errors";
export { MarkdownModule } from "./modules/markdown/markdown.module";
export { MarkdownService } from "./modules/markdown/markdown.service";
export type {
  MeasurementScope,
  TargetSize,
} from "./modules/markdown/markdown.types";
export {
  CODOMETER_MARKERS,
  HEADING,
  TABLE_HEADER,
} from "./modules/render/render.constants";
export { RenderModule } from "./modules/render/render.module";
export { RenderService } from "./modules/render/render.service";
export type { RenderSectionArguments } from "./modules/render/render.types";
export {
  formatBytes,
  formatCount,
  formatDelta,
  formatValue,
  hasChanged,
} from "./modules/render/render.utilities";
