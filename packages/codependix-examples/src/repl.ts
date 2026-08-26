import "reflect-metadata";
import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

/** Starts a NestJS REPL over the examples command application. */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
