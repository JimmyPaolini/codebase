import { Module } from "@nestjs/common";

import { GeneratorService } from "./generator.service";
import { ResolverService } from "./resolver.service";

/**
 * TODO: Document the generator module.
 */
@Module({
  controllers: [],
  exports: [GeneratorService, ResolverService],
  imports: [],
  providers: [GeneratorService, ResolverService],
})
export class GeneratorModule {}
