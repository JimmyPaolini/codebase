import { describe, expect, it } from "vitest";

import {
  LANGUAGE_MODULE_LOADER,
  LANGUAGE_MODULE_NAMESPACES,
} from "./languages.constants";

describe("language module loader", () => {
  it("hands back a package Nx already loaded", async () => {
    await expect(
      LANGUAGE_MODULE_LOADER("@conformetry/typescript"),
    ).resolves.toBe(LANGUAGE_MODULE_NAMESPACES["@conformetry/typescript"]);
  });

  it("rejects a package it was never given", async () => {
    await expect(
      LANGUAGE_MODULE_LOADER("@conformetry/cli-cobol"),
    ).rejects.toThrow("Unknown conformetry language package");
  });
});
