export { MainModule } from "./main.module";
// 📤 Exports
export { DirectoriesCommand } from "./modules/directories/directories.command";
export { PROJECT_SEPARATOR } from "./modules/directories/directories.constants";
export { DirectoriesModule } from "./modules/directories/directories.module";
export { ProjectsModule } from "./modules/projects/projects.module";
export { ProjectsService } from "./modules/projects/projects.service";
export type {
  NxProject,
  ResolvedProjectDirectories,
} from "./modules/projects/projects.types";
