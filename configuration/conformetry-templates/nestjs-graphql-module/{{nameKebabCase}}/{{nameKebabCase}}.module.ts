import { Module } from "@nestjs/common";

import { {{namePascalCase}}Resolver } from "./{{nameKebabCase}}.resolver";
import { {{namePascalCase}}Service } from "./{{nameKebabCase}}.service";

/**
 * TODO: Document the {{nameCamelCase}} module.
 */
@Module({
  exports: [{{namePascalCase}}Service],
  imports: [],
  providers: [
    {{namePascalCase}}Resolver,
    {{namePascalCase}}Service,
  ],
})
export class {{namePascalCase}}Module {}
