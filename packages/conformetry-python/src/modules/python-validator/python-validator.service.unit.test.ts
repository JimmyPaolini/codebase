import { ErrorsService } from "@conformetry/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PythonBridgeService } from "./python-bridge.service";
import { PythonValidatorService } from "./python-validator.service";

import type {
  ConformetryError,
  PreparedValidationDocument,
} from "@conformetry/core";

const TEMPLATE = [
  "import os",
  "",
  "",
  "class Widget:",
  "    def run(self):",
  "        pass",
  "",
].join("\n");

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "widget.py",
    instance: args.instance,
    instanceFilePath: "/project/widget.py",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/widget.py",
  };
}

describe(PythonValidatorService, () => {
  let service: PythonValidatorService;

  function validate(instance: string): ConformetryError[] {
    return service.validateDocument(
      createDocument({ instance, renderedTemplate: TEMPLATE }),
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ErrorsService, PythonBridgeService, PythonValidatorService],
    }).compile();

    service = await module.resolve(PythonValidatorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims Python files but not notebooks", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".py"]);
    expect(service.descriptor.name).toBe("python");
  });

  it("accepts an identical file", () => {
    expect(validate(TEMPLATE)).toStrictEqual([]);
  });

  it("accepts a reformatted file, because matching is structural", () => {
    expect(
      validate(
        "import os\n\n\n\nclass Widget:\n\n    def run(self):\n\n        pass\n",
      ),
    ).toStrictEqual([]);
  });

  it("accepts reordered declarations", () => {
    expect(
      validate(
        "class Widget:\n    def run(self):\n        pass\n\nimport os\n",
      ),
    ).toStrictEqual([]);
  });

  it("accepts a file that adds its own declarations", () => {
    expect(validate(`${TEMPLATE}\n\nclass Extra:\n    pass\n`)).toStrictEqual(
      [],
    );
  });

  it("reports a missing class", () => {
    const errors = validate("import os\n");

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('Missing ClassDef "Widget"');
    expect(errors[0]?.language).toBe("python");
  });

  it("reports a missing method within a present class", () => {
    const errors = validate("import os\n\n\nclass Widget:\n    pass\n");

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("run");
  });

  it("carries template and instance locations", () => {
    const errors = validate("import os\n");

    expect(errors[0]?.templateLine).toBeGreaterThan(0);
    expect(errors[0]?.fix).toContain("Add the missing");
  });

  it("reports a syntax error in the instance", () => {
    const errors = validate("class Widget(:\n");

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("Instance syntax error");
  });
});
