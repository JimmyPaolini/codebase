// 📤 Exports
export { DifferencesModule } from "./modules/differences/differences.module";
export { DifferencesService } from "./modules/differences/differences.service";
export type {
  ConformetryDifference,
  ConformetryDifferenceLanguage,
  ConformetryDifferenceType,
} from "./modules/differences/differences.types";
export { InventoryModule } from "./modules/inventory/inventory.module";
export { InventoryService } from "./modules/inventory/inventory.service";
export type {
  InventoriedInstance,
  InventoriedPairing,
  InventoriedTemplate,
} from "./modules/inventory/inventory.types";
export { LanguageModule } from "./modules/language/language.module";
export { LanguageService } from "./modules/language/language.service";
export type {
  ConformetryLanguageValidator,
  DocumentValidationResult,
  LanguageValidatorDescriptor,
  LanguageValidatorResult,
  PreparedValidationDocument,
  PreparedValidationPayload,
  ValidationFileResult,
} from "./modules/language/language.types";
export { ReportingModule } from "./modules/reporting/reporting.module";
export { ReportingService } from "./modules/reporting/reporting.service";
export { ScoringModule } from "./modules/scoring/scoring.module";
export { ScoringService } from "./modules/scoring/scoring.service";
export type {
  CalculateScoreArguments,
  InstanceScore,
  WeightedFinding,
} from "./modules/scoring/scoring.types";
