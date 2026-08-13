import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationFindingsService } from "./validation-findings.service";

import type {
  TemplateDefinition,
  UnmatchedInstance,
} from "@jimmypaolini/conformetry-configuration";

const TEMPLATES: TemplateDefinition[] = [
  {
    directoryPath: "/w/configuration/templates/widget",
    filePaths: [],
    name: "widget",
  },
];

/** Builds an unmatched candidate for `packages/widgets/src/modules/gears`. */
function buildUnmatched(args: {
  candidateTemplateNames: string[];
  reason: "ambiguous" | "no-match";
}): UnmatchedInstance {
  return {
    candidate: {
      instancePath: "/w/packages/widgets/src/modules",
      nameStem: "gears",
    },
    candidateTemplateNames: args.candidateTemplateNames,
    reason: args.reason,
  };
}

describe(ValidationFindingsService, () => {
  let service: ValidationFindingsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidationFindingsService],
    }).compile();

    service = await module.resolve(ValidationFindingsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildUnmatchedResults", () => {
    it("names the instance rather than the directory it sits in", () => {
      const [result] = service.buildUnmatchedResults({
        templates: TEMPLATES,
        unmatched: [
          buildUnmatched({ candidateTemplateNames: [], reason: "no-match" }),
        ],
      });

      expect(result?.filename).toBe("gears");
      expect(result?.instanceFilePath).toBe(
        "/w/packages/widgets/src/modules/gears",
      );
    });

    it("reports an unexplained path as an instance error", () => {
      const [result] = service.buildUnmatchedResults({
        templates: TEMPLATES,
        unmatched: [
          buildUnmatched({ candidateTemplateNames: [], reason: "no-match" }),
        ],
      });

      expect(result?.errors[0]?.errorType).toBe("instance");
      expect(result?.errors[0]?.message).toContain("no template explains");
    });

    it("names the templates that tied when the match is ambiguous", () => {
      const [result] = service.buildUnmatchedResults({
        templates: TEMPLATES,
        unmatched: [
          buildUnmatched({
            candidateTemplateNames: ["alpha", "beta"],
            reason: "ambiguous",
          }),
        ],
      });

      expect(result?.errors[0]?.message).toContain("alpha, beta");
      expect(result?.errors[0]?.fix).toContain("distinguishing files");
    });

    it("points at the directory the templates share", () => {
      const [result] = service.buildUnmatchedResults({
        templates: TEMPLATES,
        unmatched: [
          buildUnmatched({ candidateTemplateNames: [], reason: "no-match" }),
        ],
      });

      expect(result?.templateFilePath).toBe("/w/configuration/templates");
    });

    it("names no directory when there are no templates to share one", () => {
      const [result] = service.buildUnmatchedResults({
        templates: [],
        unmatched: [
          buildUnmatched({ candidateTemplateNames: [], reason: "no-match" }),
        ],
      });

      expect(result?.templateFilePath).toBe("");
    });

    it("returns nothing when every candidate matched", () => {
      expect(
        service.buildUnmatchedResults({ templates: TEMPLATES, unmatched: [] }),
      ).toStrictEqual([]);
    });
  });
});
