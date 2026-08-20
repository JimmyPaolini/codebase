import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { BundleMarkdownModule } from "../bundle-markdown/bundle-markdown.module";
import { ReportingMarkersService } from "../reporting/reporting-markers.service";
import { ReportingService } from "../reporting/reporting.service";

import { BundlesCommand } from "./bundles.command";
import { BundlesService } from "./bundles.service";

/**
 * Owns the bundle size report: reading what the `codometer` target measured,
 * and saying what it means.
 *
 * The shared reporting services are provided here rather than imported from
 * the reporting module, which imports this one — they are stateless, so a
 * second instance costs nothing and the module graph stays acyclic.
 */
@Module({
  controllers: [],
  exports: [BundlesCommand, BundlesService],
  imports: [BundleMarkdownModule, LoggerModule],
  providers: [
    BundlesCommand,
    BundlesService,
    ReportingMarkersService,
    ReportingService,
  ],
})
export class BundlesModule {}
