import { DotCountCharacteristicService } from "./dot-count-characteristic.service";
import { HorizontalEdgeCountCharacteristicService } from "./horizontal-edge-count-characteristic.service";
import { VerticalEdgeCountCharacteristicService } from "./vertical-edge-count-characteristic.service";

// ♟️ Constants

/**
 * Every 1×1 point characteristic evaluator — bare points and straight
 * edges — listed once so `CharacteristicsModule` provides and exports the
 * group with a single spread.
 */
export const POINT_CHARACTERISTIC_SERVICES = [
  DotCountCharacteristicService,
  HorizontalEdgeCountCharacteristicService,
  VerticalEdgeCountCharacteristicService,
] as const;
