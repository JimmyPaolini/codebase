import { describe, expect, it } from "vitest";

import {
  PYTHON_VALIDATOR_FILE_EXTENSIONS,
  PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./python-validator.constants";

describe("pythonValidatorConstants", () => {
  it("defines the expected python-related file extensions", () => {
    expect(PYTHON_VALIDATOR_FILE_EXTENSIONS).toStrictEqual([".ipynb", ".py"]);
  });

  it("exposes the validator plugin descriptor", () => {
    expect(PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR).toStrictEqual({
      description: "Checks Python and notebook conformance against templates",
      fileExtensions: [".ipynb", ".py"],
      name: "python",
    });
  });
});
