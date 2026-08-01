import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

/**
 * TODO: Document the {{nameCamelCase}} command.
 */
@Command({
  description: "Run the {{nameKebabCase}} command",
  name: "{{nameKebabCase}}",
})
@Injectable()
export class {{namePascalCase}}Command extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext({{namePascalCase}}Command.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  async run(): Promise<void> {
    // TODO: Implement command behavior
  }
}
