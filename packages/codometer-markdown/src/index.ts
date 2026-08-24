// 📤 Exports

export { DocumentsModule } from "./modules/documents/documents.module";
export { DocumentsService } from "./modules/documents/documents.service";
export type {
  DocumentDestination,
  DocumentMarkers,
  EmitArguments,
} from "./modules/documents/documents.types";
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
