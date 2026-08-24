export { MainModule } from "./main.module";
// 📤 Exports
export { AnchorNotFoundError } from "./modules/anchors/anchors.errors";
export { AnchorsModule } from "./modules/anchors/anchors.module";
export { AnchorsService } from "./modules/anchors/anchors.service";
export type { AnchorCheckResult } from "./modules/anchors/anchors.types";
export { CodependixCommand } from "./modules/codependix/codependix.command";
export { CodependixModule } from "./modules/codependix/codependix.module";
export { CodependixService } from "./modules/codependix/codependix.service";
export type {
  CodependixCommandOptions,
  CodependixRunMode,
  NxNeighborhoodExport,
  ProjectRunResult,
} from "./modules/codependix/codependix.types";
