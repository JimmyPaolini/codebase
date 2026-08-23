import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { CatalogManifestsModule } from "./modules/catalog-manifests/catalog-manifests.module";
import { CodometerTargetsModule } from "./modules/codometer-targets/codometer-targets.module";
import { LockfileModule } from "./modules/lockfile/lockfile.module";
import { PullRequestBodyModule } from "./modules/pull-request-body/pull-request-body.module";
import { PullRequestMetadataModule } from "./modules/pull-request-metadata/pull-request-metadata.module";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    CatalogManifestsModule,
    CodometerTargetsModule,
    DiscoveryModule,
    LockfileModule,
    LoggerModule,
    PullRequestBodyModule,
    PullRequestMetadataModule,
  ],
})
export class MainModule {}
