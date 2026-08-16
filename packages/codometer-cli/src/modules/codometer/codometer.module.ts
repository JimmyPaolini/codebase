import { ConfigurationModule } from "@codometer/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { CssModule } from "../css/css.module";
import { DiscoveryModule } from "../discovery/discovery.module";
import { HclModule } from "../hcl/hcl.module";
import { JsonModule } from "../json/json.module";
import { JupyterModule } from "../jupyter/jupyter.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";
import { PythonModule } from "../python/python.module";
import { ShellModule } from "../shell/shell.module";
import { SqlModule } from "../sql/sql.module";
import { TomlModule } from "../toml/toml.module";
import { TypescriptModule } from "../typescript/typescript.module";
import { YamlModule } from "../yaml/yaml.module";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

/**
 * NestJS module that wires the codometer command and measurement services.
 */
@Module({
  controllers: [],
  exports: [CodometerCommand, CodometerService],
  imports: [
    ConfigurationModule,
    CssModule,
    DiscoveryModule,
    HclModule,
    LoggerModule,
    JsonModule,
    JupyterModule,
    MarkdownModule,
    OutputJsonModule,
    OutputMarkdownModule,
    PythonModule,
    ShellModule,
    SqlModule,
    TomlModule,
    TypescriptModule,
    YamlModule,
  ],
  providers: [CodometerCommand, CodometerService],
})
export class CodometerModule {}
