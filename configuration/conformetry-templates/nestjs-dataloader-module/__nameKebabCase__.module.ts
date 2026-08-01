import { Module } from "@nestjs/common";

import { {{namePascalCase}}DataLoader } from "./{{nameKebabCase}}.dataloader";

/**
 * TODO: Document the {{nameCamelCase}} dataloader module.
 */
@Module({
  exports: [{{namePascalCase}}DataLoader],
  imports: [],
  providers: [{{namePascalCase}}DataLoader],
})
export class {{namePascalCase}}Module {}
