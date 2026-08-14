import { JsonValidatorModule } from "@conformetry/json";
import { MarkdownValidatorModule } from "@conformetry/markdown";
import { PythonValidatorModule } from "@conformetry/python";
import { Module } from "@nestjs/common";

import { JupyterNotebookService } from "./jupyter-notebook.service";
import { JupyterValidatorService } from "./jupyter-validator.service";

/**
 * Provides the Jupyter notebook validator.
 *
 * Composes the JSON, markdown, and Python validators rather than
 * reimplementing any of them — a notebook is all three formats at once.
 */
@Module({
  controllers: [],
  exports: [JupyterValidatorService],
  imports: [
    JsonValidatorModule,
    MarkdownValidatorModule,
    PythonValidatorModule,
  ],
  providers: [JupyterNotebookService, JupyterValidatorService],
})
export class JupyterValidatorModule {}
