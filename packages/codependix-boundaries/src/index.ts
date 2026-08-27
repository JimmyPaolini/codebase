// 📤 Exports
export {
  CYCLE_SEPARATOR,
  describeCycle,
  describeDisallowedEdge,
  describeForbiddenEdge,
} from "./modules/boundaries/boundaries.constants";
export { BoundariesModule } from "./modules/boundaries/boundaries.module";
export { BoundariesService } from "./modules/boundaries/boundaries.service";
export type {
  BoundaryCycle,
  BoundaryEdge,
  BoundaryGraph,
  BoundaryNode,
  BoundaryViolation,
  EvaluateBoundariesArguments,
  FindCyclesArguments,
} from "./modules/boundaries/boundaries.types";
export { BoundaryCyclesService } from "./modules/boundaries/boundary-cycles.service";
export { BoundaryReportService } from "./modules/boundaries/boundary-report.service";
export { BoundarySelectorService } from "./modules/boundaries/boundary-selector.service";
