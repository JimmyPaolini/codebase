import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

/**
 * Bootstraps the NestJS REPL for the conformance tool.
 */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
