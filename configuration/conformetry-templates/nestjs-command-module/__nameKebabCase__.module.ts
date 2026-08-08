import { Module } from "@nestjs/common";

import { {{namePascalCase}}Command } from "./{{nameKebabCase}}.command";

/**
 * TODO: Document the {{nameCamelCase}} module.
 */
@Module({
  controllers: [],
  exports: [{{namePascalCase}}Command],
  imports: [],
  providers: [{{namePascalCase}}Command],
})
export class {{namePascalCase}}Module {}
