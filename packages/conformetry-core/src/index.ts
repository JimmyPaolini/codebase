// 📤 Exports
export { ErrorsModule } from "./modules/errors/errors.module";
export { ErrorsService } from "./modules/errors/errors.service";
export type {
  ConformetryError,
  ConformetryErrorLanguage,
  ConformetryErrorType,
} from "./modules/errors/errors.types";
export { LanguageModule } from "./modules/language/language.module";
export { LanguageService } from "./modules/language/language.service";
export type {
  ConformetryLanguageValidator,
  LanguageValidatorDescriptor,
  LanguageValidatorResult,
  PreparedValidationDocument,
  PreparedValidationPayload,
  ValidationFileResult,
} from "./modules/language/language.types";
export { ReportingModule } from "./modules/reporting/reporting.module";
export { ReportingService } from "./modules/reporting/reporting.service";
