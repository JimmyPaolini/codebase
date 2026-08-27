import { Module } from "@nestjs/common";

import { OutputFilenameService } from "./output-filename.service";
import { SvgRenderingService } from "./svg-rendering.service";

/**
 * Wires up the two services that turn finished path data into files on
 * disk: the SVG document itself, and the filename a set of generation
 * parameters is written under.
 */
@Module({
  controllers: [],
  exports: [OutputFilenameService, SvgRenderingService],
  imports: [],
  providers: [OutputFilenameService, SvgRenderingService],
})
export class SvgRenderingModule {}
