import fs from "node:fs";
import path from "node:path";

console.log("Mock findInstances:");
console.log(
  fs
    .globSync("packages/ic-suite/callidescope/callidescope-cli", {
      cwd: process.cwd(),
      withFileTypes: true,
    })
    .map((e) => ({ name: e.name, parentPath: e.parentPath })),
);
