// 📤 Exports
export { MainModule } from "./main.module";
export { CodometerCommand } from "./modules/codometer/codometer.command";
export { CodometerModule } from "./modules/codometer/codometer.module";
export { CodometerService } from "./modules/codometer/codometer.service";
export type {
  CodometerCommandOptions,
  MeasureArguments,
} from "./modules/codometer/codometer.types";
export { CustomStatisticsModule } from "./modules/custom-statistics/custom-statistics.module";
export { CustomStatisticsService } from "./modules/custom-statistics/custom-statistics.service";
export { FileDiscoveryModule } from "./modules/file-discovery/file-discovery.module";
export { FileDiscoveryService } from "./modules/file-discovery/file-discovery.service";
export type { FileDiscoveryResult } from "./modules/file-discovery/file-discovery.types";
export { ReportModule } from "./modules/report/report.module";
export { ReportService } from "./modules/report/report.service";
export type {
  CodometerReport,
  ReportFailure,
  ReportLimit,
  ReportMetric,
  ReportTarget,
} from "./modules/report/report.types";
