import { DiscoveryModule } from "@conformetry/configuration";
import { ErrorsModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { FilesService } from "./files.service";

/**
 * Provides file and directory existence checking.
 *
 * Imported by `conformetry-validation`, which runs it before delegating to any
 * language validator — a file that is absent cannot be compared.
 */
@Module({
  controllers: [],
  exports: [FilesService],
  imports: [DiscoveryModule, ErrorsModule],
  providers: [FilesService],
})
export class FilesModule {}
