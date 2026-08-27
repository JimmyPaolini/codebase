// 📤 Exports

export { DiscoveryModule } from "./modules/discovery/discovery.module";
export { DiscoveryService } from "./modules/discovery/discovery.service";
export type {
  DiscoverFilesArguments,
  DiscoveryResult,
  WalkDirectoryArguments,
  WalkSubdirectoryArguments,
} from "./modules/discovery/discovery.types";
export { TargetOutsideRepositoryError } from "./modules/targets/targets.constants";
export { TargetsModule } from "./modules/targets/targets.module";
export { TargetsService } from "./modules/targets/targets.service";
export type {
  MatchTargetFilesArguments,
  TargetEntryKind,
  WalkTargetArguments,
} from "./modules/targets/targets.types";
