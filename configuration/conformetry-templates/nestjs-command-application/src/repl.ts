import "reflect-metadata";

import { repl } from "@nestjs/core";

import { MainModule } from "./main.module";

async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

void bootstrap();
