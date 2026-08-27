// 📤 Exports
export {
  BOUNDARY_LEVEL_ORDER,
  WORKSPACE_SCOPE,
} from "./modules/boundary-check/boundary-check.constants";
export { BoundaryCheckModule } from "./modules/boundary-check/boundary-check.module";
export { BoundaryCheckService } from "./modules/boundary-check/boundary-check.service";
export type {
  BoundaryCheckContext,
  BoundaryCheckFailure,
  BoundaryCheckOutcome,
  LevelCheckArguments,
} from "./modules/boundary-check/boundary-check.types";
export { BoundaryGraphService } from "./modules/boundary-check/boundary-graph.service";
