import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";
import { JupyterNotebookApplicationModule } from "../jupyter-notebook-application/jupyter-notebook-application.module";
import { LoggerModule } from "../logger/logger.module";
import { NestjsCommandApplicationModule } from "../nestjs-command-application/nestjs-command-application.module";
import { NestjsCommandModuleModule } from "../nestjs-command-module/nestjs-command-module.module";
import { NestjsDataloaderModuleModule } from "../nestjs-dataloader-module/nestjs-dataloader-module.module";
import { NestjsGraphqlApplicationModule } from "../nestjs-graphql-application/nestjs-graphql-application.module";
import { NestjsGraphqlModuleModule } from "../nestjs-graphql-module/nestjs-graphql-module.module";
import { NestjsServiceFileModule } from "../nestjs-service-file/nestjs-service-file.module";
import { NestjsServiceModuleModule } from "../nestjs-service-module/nestjs-service-module.module";
import { ReactComponentModule } from "../react-component/react-component.module";

import { ValidatorAbstractSyntaxTreeService } from "./validator-abstract-syntax-tree.service";
import { ValidatorCommentsService } from "./validator-comments.service";
import { ValidatorFilesService } from "./validator-files.service";
import { ValidatorJsonService } from "./validator-json.service";
import { ValidatorMarkdownService } from "./validator-markdown.service";
import { ValidatorNodesService } from "./validator-nodes.service";
import { ValidatorPythonService } from "./validator-python.service";
import { ValidatorRulesService } from "./validator-rules.service";
import { ValidatorTemplateService } from "./validator-template.service";
import { ValidatorTextService } from "./validator-text.service";
import { ValidatorTypescriptService } from "./validator-typescript.service";
import { ValidatorWorkspaceService } from "./validator-workspace.service";
import { ValidatorCommand } from "./validator.command";
import { ValidatorService } from "./validator.service";

/**
 * Validator command module for workspace conformance checks.
 */
@Module({
  controllers: [],
  exports: [
    ValidatorAbstractSyntaxTreeService,
    ValidatorCommentsService,
    ValidatorCommand,
    ValidatorFilesService,
    ValidatorJsonService,
    ValidatorMarkdownService,
    ValidatorNodesService,
    ValidatorPythonService,
    ValidatorRulesService,
    ValidatorService,
    ValidatorTemplateService,
    ValidatorTextService,
    ValidatorTypescriptService,
    ValidatorWorkspaceService,
  ],
  imports: [
    GeneratorModule,
    JupyterNotebookApplicationModule,
    LoggerModule,
    NestjsCommandApplicationModule,
    NestjsCommandModuleModule,
    NestjsDataloaderModuleModule,
    NestjsGraphqlApplicationModule,
    NestjsGraphqlModuleModule,
    NestjsServiceFileModule,
    NestjsServiceModuleModule,
    ReactComponentModule,
  ],
  providers: [
    ValidatorAbstractSyntaxTreeService,
    ValidatorCommentsService,
    ValidatorCommand,
    ValidatorFilesService,
    ValidatorJsonService,
    ValidatorMarkdownService,
    ValidatorNodesService,
    ValidatorPythonService,
    ValidatorRulesService,
    ValidatorService,
    ValidatorTemplateService,
    ValidatorTextService,
    ValidatorTypescriptService,
    ValidatorWorkspaceService,
  ],
})
export class ValidatorModule {}
