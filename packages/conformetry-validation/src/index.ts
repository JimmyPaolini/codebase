// 📤 Exports
export { DiscoveryScopeService } from "./modules/discovery/discovery-scope.service";
export { DiscoveryModule as WorkspaceDiscoveryModule } from "./modules/discovery/discovery.module";
export { DiscoveryService as WorkspaceDiscoveryService } from "./modules/discovery/discovery.service";
export { ValidationLanguagesService } from "./modules/validation/validation-languages.service";
export { ValidationSelectionService } from "./modules/validation/validation-selection.service";
export { ValidationModule } from "./modules/validation/validation.module";
export { ValidationService } from "./modules/validation/validation.service";
export type {
  RunValidationArguments,
  RunValidationResult,
} from "./modules/validation/validation.types";
