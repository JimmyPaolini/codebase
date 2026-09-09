import "reflect-metadata";

import { run } from "./address-table/run";

const { exitCode, lines } = await run(process.argv.slice(2));

for (const line of lines) {
  if (exitCode === 0) console.info(line);
  else console.error(line);
}

process.exitCode = exitCode;
