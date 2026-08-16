import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// Aliased because this package now has a DiscoveryModule of its own, which
// discovers files rather than providers.
import { DiscoveryModule as NestDiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { CodometerModule } from "./modules/codometer/codometer.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { JsonModule } from "./modules/json/json.module";
import { JupyterModule } from "./modules/jupyter/jupyter.module";
import { MarkdownModule } from "./modules/markdown/markdown.module";
import { OutputJsonModule } from "./modules/output-json/output-json.module";
import { OutputMarkdownModule } from "./modules/output-markdown/output-markdown.module";
import { PythonModule } from "./modules/python/python.module";
import { TypescriptModule } from "./modules/typescript/typescript.module";
import { YamlModule } from "./modules/yaml/yaml.module";

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
    NestDiscoveryModule,
    LoggerModule,
    CodometerModule,
    ConfigurationModule,
    DiscoveryModule,
    JsonModule,
    JupyterModule,
    MarkdownModule,
    OutputJsonModule,
    OutputMarkdownModule,
    PythonModule,
    TypescriptModule,
    YamlModule,
  ],
})
export class MainModule {}
