import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { JupyterNotebookApplicationModule } from "./modules/jupyter-notebook-application/jupyter-notebook-application.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { NestjsCommandApplicationModule } from "./modules/nestjs-command-application/nestjs-command-application.module";
import { NestjsCommandModuleModule } from "./modules/nestjs-command-module/nestjs-command-module.module";
import { NestjsDataloaderModuleModule } from "./modules/nestjs-dataloader-module/nestjs-dataloader-module.module";
import { NestjsGraphqlApplicationModule } from "./modules/nestjs-graphql-application/nestjs-graphql-application.module";
import { NestjsGraphqlModuleModule } from "./modules/nestjs-graphql-module/nestjs-graphql-module.module";
import { NestjsServiceFileModule } from "./modules/nestjs-service-file/nestjs-service-file.module";
import { NestjsServiceModuleModule } from "./modules/nestjs-service-module/nestjs-service-module.module";
import { ReactComponentModule } from "./modules/react-component/react-component.module";
import { ValidatorModule } from "./modules/validator/validator.module";

/**
 * Root NestJS application module.
 *
 * Imports all command modules (generators and validator).
 * Nest-commander automatically discovers and registers all CommandRunner providers.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    LoggerModule,
    JupyterNotebookApplicationModule,
    NestjsCommandApplicationModule,
    NestjsCommandModuleModule,
    NestjsDataloaderModuleModule,
    NestjsGraphqlApplicationModule,
    NestjsGraphqlModuleModule,
    NestjsServiceFileModule,
    NestjsServiceModuleModule,
    ReactComponentModule,
    ValidatorModule,
  ],
})
export class MainModule {}
