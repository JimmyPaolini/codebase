import { Module } from "@nestjs/common";

import { GeneratorModule } from "../generator/generator.module";

import { JupyterNotebookApplicationCommand } from "./jupyter-notebook-application.command";

/**
 * TODO: Document the jupyterNotebookApplicationGenerator module.
 */
@Module({
  controllers: [],
  exports: [JupyterNotebookApplicationCommand],
  imports: [GeneratorModule],
  providers: [JupyterNotebookApplicationCommand],
})
export class JupyterNotebookApplicationModule {}
