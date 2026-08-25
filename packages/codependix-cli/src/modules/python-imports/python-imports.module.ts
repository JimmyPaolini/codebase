import { ConfigurationModule } from "@codependix/configuration";
import {
  PythonImportGraphModule,
  PythonProjectModule,
} from "@codependix/imports-python";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { PythonImportsService } from "./python-imports.service";

/** Provides the Python file-level import graph pass. */
@Module({
  controllers: [],
  exports: [PythonImportsService],
  imports: [
    ConfigurationModule,
    DeliveryModule,
    PythonImportGraphModule,
    PythonProjectModule,
  ],
  providers: [PythonImportsService],
})
export class PythonImportsModule {}
