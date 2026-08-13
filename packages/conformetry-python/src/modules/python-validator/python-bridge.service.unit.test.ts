import { ErrorsModule } from "@jimmypaolini/conformetry-core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PythonBridgeService } from "./python-bridge.service";

describe(PythonBridgeService, () => {
  let service: PythonBridgeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ErrorsModule],
      providers: [PythonBridgeService],
    }).compile();

    service = await module.resolve(PythonBridgeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("validatePythonSource", () => {
    it("reports nothing when the instance satisfies the template", () => {
      expect(
        service.validatePythonSource({
          filename: "alpha.py",
          instance: "import os\n\n\ndef alpha():\n    return os\n",
          template: "import os\n",
        }),
      ).toStrictEqual([]);
    });

    it("reports an import the instance lacks", () => {
      const errors = service.validatePythonSource({
        filename: "alpha.py",
        instance: "def alpha():\n    return 1\n",
        template: "import os\n",
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.language).toBe("python");
    });

    it("ignores statements the template does not declare", () => {
      expect(
        service.validatePythonSource({
          filename: "alpha.py",
          instance: "import os\nimport sys\n",
          template: "import os\n",
        }),
      ).toStrictEqual([]);
    });
  });
});
