import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module.js";

/**
 * Starts the NestJS REPL for the metitur application.
 */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
