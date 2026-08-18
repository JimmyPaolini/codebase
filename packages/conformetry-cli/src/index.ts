// 📤 Exports
export { MainModule } from "./main.module";
export { ExplainCommand } from "./modules/explain/explain.command";
export { ExplainModule } from "./modules/explain/explain.module";
export type {
  ConsideredTemplate,
  ExplainCommandOptions,
  ExplainedInstance,
  ExplainVerdict,
} from "./modules/explain/explain.types";
export { GenerateCommand } from "./modules/generate/generate.command";
export { GenerateModule } from "./modules/generate/generate.module";
export type { GenerateCommandOptions } from "./modules/generate/generate.types";
export { ListCommand } from "./modules/list/list.command";
export { ListModule } from "./modules/list/list.module";
export type {
  ListCommandOptions,
  ListedGenerator,
} from "./modules/list/list.types";
export { ValidateCommand } from "./modules/validate/validate.command";
export { ValidateModule } from "./modules/validate/validate.module";
export type { ValidateCommandOptions } from "./modules/validate/validate.types";
