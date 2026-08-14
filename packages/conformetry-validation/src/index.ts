// 📤 Exports
export { ValidationDeduplicationService } from "./modules/validation/validation-deduplication.service";
export { ValidationFindingsService } from "./modules/validation/validation-findings.service";
export { ValidationLanguagesService } from "./modules/validation/validation-languages.service";
export { MissingLanguagePackageError } from "./modules/validation/validation.errors";
export { ValidationModule } from "./modules/validation/validation.module";
export { ValidationService } from "./modules/validation/validation.service";
export type {
  InstanceFileResults,
  LanguageModuleLoader,
  RunValidationArguments,
  RunValidationResult,
} from "./modules/validation/validation.types";
