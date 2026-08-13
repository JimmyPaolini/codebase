// 🏷️ Types

/**
 * Options supported by the migrated service file generator.
 */
export interface NestjsServiceFileOptions {
  module?: string;
  name?: string;
  project?: string;
}

/**
 * Template substitutions used by this module's templates.
 */
export interface NestjsServiceFileSubstitutions {
  nameCamelCase: string;
  nameKebabCase: string;
  namePascalCase: string;
}
