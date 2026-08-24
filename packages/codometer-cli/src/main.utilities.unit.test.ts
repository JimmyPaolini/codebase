import { describe, expect, it } from "vitest";

import { withDefaultCommand } from "./main.utilities";

describe(withDefaultCommand, () => {
  it("inserts codometer ahead of a bare flag", () => {
    expect(withDefaultCommand(["--directory", "."])).toStrictEqual([
      "codometer",
      "--directory",
      ".",
    ]);
  });

  it("inserts codometer when no arguments were given", () => {
    expect(withDefaultCommand([])).toStrictEqual(["codometer"]);
  });

  it("leaves an explicit codometer invocation alone", () => {
    expect(withDefaultCommand(["codometer", "--write"])).toStrictEqual([
      "codometer",
      "--write",
    ]);
  });

  it("leaves an explicit changes invocation alone", () => {
    expect(
      withDefaultCommand(["changes", "--baseline", ".baseline"]),
    ).toStrictEqual(["changes", "--baseline", ".baseline"]);
  });

  it.each(["-h", "--help"])(
    "leaves a bare %s alone, so it lists every command",
    (flag) => {
      expect(withDefaultCommand([flag])).toStrictEqual([flag]);
    },
  );

  it("leaves the help command alone", () => {
    expect(withDefaultCommand(["help", "changes"])).toStrictEqual([
      "help",
      "changes",
    ]);
  });
});
