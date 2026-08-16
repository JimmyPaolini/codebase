import { Module } from "@nestjs/common";

import { YamlService } from "./yaml.service";

/**
 * NestJS module that provides YAML document analysis.
 */
@Module({
  controllers: [],
  exports: [YamlService],
  imports: [],
  providers: [YamlService],
})
export class YamlModule {}
