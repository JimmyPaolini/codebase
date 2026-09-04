import { Module } from "@nestjs/common";

import { OutputPathService } from "./output-path.service";
import { SvgRenderingService } from "./svg-rendering.service";

/**
 * Wires up the two services that turn finished path data into files on
 * disk: the SVG document itself, and the filename a set of generation
 * parameters is written under.
 */
@Module({
  controllers: [],
  exports: [OutputPathService, SvgRenderingService],
  imports: [],
  providers: [OutputPathService, SvgRenderingService],
})
export class SvgRenderingModule {}
