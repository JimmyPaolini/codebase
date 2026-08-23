import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { IssueMetadataService } from "./issue-metadata.service";

import type {
  IssueFormAnswers,
  IssueMetadata,
  MetadataVerdict,
} from "./issue-metadata.types";

/** A rendered `issue.yml` body naming this Type and Scope. */
const formBody = (type: string, scope: string): string =>
  [
    "### Type",
    "",
    type,
    "",
    "### Scope",
    "",
    scope,
    "",
    "### Description",
    "",
    "Something broke.",
    "",
  ].join("\n");

/** An issue whose labels agree with a template submission of feat/lexico. */
const validMetadata: IssueMetadata = {
  body: formBody("feat", "lexico"),
  labelNames: ["scope:lexico", "source:human", "type:feat"],
};

describe(IssueMetadataService, () => {
  let service: IssueMetadataService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [IssueMetadataService],
    }).compile();

    service = await module.resolve(IssueMetadataService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  /** Runs the check for one issue's metadata. */
  const check = (metadata: IssueMetadata, issueNumber = "7"): MetadataVerdict =>
    service.checkMetadata({
      formAnswers: service.parseFormAnswers(metadata.body),
      issueNumber,
      metadata,
    });

  describe("parseFormAnswers", () => {
    it("reads both answers from a rendered submission", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers(formBody("feat", "lexico")),
      ).toStrictEqual({
        scope: "lexico",
        type: "feat",
      });
    });

    it("reads nothing from a body with no form markers", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers("Just a plain description, no template."),
      ).toStrictEqual({});
    });

    it.each([
      ["Type", { scope: "lexico" } satisfies IssueFormAnswers],
      ["Scope", { type: "feat" } satisfies IssueFormAnswers],
    ])("reads only the field present when %s is missing", (field, expected) => {
      expect.hasAssertions();

      const body =
        field === "Type"
          ? ["### Scope", "", "lexico", ""].join("\n")
          : ["### Type", "", "feat", ""].join("\n");

      expect(service.parseFormAnswers(body)).toStrictEqual(expected);
    });

    it("treats an unfilled optional field marker as no answer", () => {
      expect.hasAssertions();

      const body = ["### Type", "", "_No response_", ""].join("\n");

      expect(service.parseFormAnswers(body)).toStrictEqual({});
    });

    it("tolerates CRLF line endings", () => {
      expect.hasAssertions();

      const body = "### Type\r\n\r\nfix\r\n\r\n### Scope\r\n\r\ntools\r\n";

      expect(service.parseFormAnswers(body)).toStrictEqual({
        scope: "tools",
        type: "fix",
      });
    });
  });

  describe("checkMetadata", () => {
    it("passes an issue whose labels agree with its template submission", () => {
      expect.hasAssertions();
      expect(check(validMetadata)).toStrictEqual({
        failures: [],
        remediationCommands: [],
      });
    });

    it("reports a type label that disagrees with the form answer", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:human", "type:fix"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: type:fix)",
        ],
        remediationCommands: [
          "gh issue edit 7 --remove-label type:fix",
          "gh issue edit 7 --add-label type:feat",
        ],
      });
    });

    it("reports an extra type label without an add command when the expected one is present", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [
            "scope:lexico",
            "source:human",
            "type:feat",
            "type:chore",
          ],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: type:feat type:chore)",
        ],
        remediationCommands: ["gh issue edit 7 --remove-label type:chore"],
      });
    });

    it("reports a missing type label when the form named one", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: ["scope:lexico", "source:human"],
        }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one type label: type:feat (found: none)",
        ],
        remediationCommands: ["gh issue edit 7 --add-label type:feat"],
      });
    });

    it("accepts any single type label when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent", "type:chore"],
        }),
      ).toStrictEqual({ failures: [], remediationCommands: [] });
    });

    it("reports no type label when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent"],
        }),
      ).toStrictEqual({
        failures: ["❌ Expected exactly one type label (found: none)"],
        remediationCommands: [],
      });
    });

    it("reports two type labels when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: [
            "scope:lexico",
            "source:agent",
            "type:chore",
            "type:fix",
          ],
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one type label (found: type:chore type:fix)",
      ]);
    });

    it("reports a missing scope label when the form named one", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, labelNames: ["source:human", "type:feat"] }),
      ).toStrictEqual({
        failures: ["❌ Missing scope label: scope:lexico"],
        remediationCommands: ["gh issue edit 7 --add-label scope:lexico"],
      });
    });

    it("accepts any scope label when the form named none but one is present", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["scope:lexico", "source:agent", "type:chore"],
        }).failures,
      ).toStrictEqual([]);
    });

    it("reports no scope label at all when the body has no form markers", () => {
      expect.hasAssertions();
      expect(
        check({
          body: "Plain issue, no template.",
          labelNames: ["source:agent", "type:chore"],
        }),
      ).toStrictEqual({
        failures: ["❌ No scope label"],
        remediationCommands: [],
      });
    });

    it("offers two alternatives for a missing source label", () => {
      expect.hasAssertions();
      expect(
        check({ ...validMetadata, labelNames: ["scope:lexico", "type:feat"] }),
      ).toStrictEqual({
        failures: [
          "❌ Expected exactly one source label: source:agent or source:human (found: none)",
        ],
        remediationCommands: [
          "add exactly one source label, either:",
          "gh issue edit 7 --add-label source:agent",
          "gh issue edit 7 --add-label source:human",
        ],
      });
    });

    it("reports two source labels", () => {
      expect.hasAssertions();
      expect(
        check({
          ...validMetadata,
          labelNames: [...validMetadata.labelNames, "source:agent"],
        }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one source label: source:agent or source:human (found: source:human source:agent)",
      ]);
    });

    it("collects every failure at once", () => {
      expect.hasAssertions();
      expect(
        check({ body: "Plain issue, no template.", labelNames: [] }).failures,
      ).toStrictEqual([
        "❌ Expected exactly one type label (found: none)",
        "❌ No scope label",
        "❌ Expected exactly one source label: source:agent or source:human (found: none)",
      ]);
    });

    it("names the issue number it was given", () => {
      expect.hasAssertions();
      expect(
        check(
          { ...validMetadata, labelNames: ["scope:lexico", "type:feat"] },
          "<number>",
        ).remediationCommands,
      ).toStrictEqual([
        "add exactly one source label, either:",
        "gh issue edit <number> --add-label source:agent",
        "gh issue edit <number> --add-label source:human",
      ]);
    });
  });

  describe("groupLabels", () => {
    it("sorts labels into their families", () => {
      expect.hasAssertions();
      expect(
        service.groupLabels([
          "scope:lexico",
          "source:human",
          "type:feat",
          "status:needs-triage",
        ]),
      ).toStrictEqual({
        scopeLabels: ["scope:lexico"],
        sourceLabels: ["source:human"],
        typeLabels: ["type:feat"],
      });
    });
  });

  describe("resolveFromDocument", () => {
    it("reads the body and labels", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromDocument(
          JSON.stringify({
            body: formBody("feat", "lexico"),
            labels: [{ name: "type:feat" }],
          }),
        ),
      ).toStrictEqual({
        metadata: {
          body: formBody("feat", "lexico"),
          labelNames: ["type:feat"],
        },
        resolved: true,
      });
    });

    it("reports a document that is not JSON", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("{").resolved).toBe(false);
    });

    it("names the gh issue view output in the failure", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromDocument("not json");

      expect(resolution.resolved ? "" : resolution.failure).toContain(
        "❌ Unable to parse the gh issue view output: ",
      );
    });

    it("treats a document that is not an object as empty metadata", () => {
      expect.hasAssertions();
      expect(service.resolveFromDocument("null")).toStrictEqual({
        metadata: { body: "", labelNames: [] },
        resolved: true,
      });
    });

    it("reads plain string labels too, dropping entries with no readable name", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromDocument(
          JSON.stringify({
            body: "",
            labels: [" type:feat ", 42, { tint: "red" }],
          }),
        ),
      ).toStrictEqual({
        metadata: { body: "", labelNames: ["type:feat"] },
        resolved: true,
      });
    });
  });

  describe("resolveFromEnvironment", () => {
    it("reads the body and label objects", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({
          body: formBody("feat", "lexico"),
          labelsDocument: '[{"name":"type:feat"}]',
        }),
      ).toStrictEqual({
        metadata: {
          body: formBody("feat", "lexico"),
          labelNames: ["type:feat"],
        },
        resolved: true,
      });
    });

    it("reports a labels document that is not JSON", () => {
      expect.hasAssertions();

      const resolution = service.resolveFromEnvironment({
        body: "",
        labelsDocument: "not json",
      });

      expect(resolution.resolved ? "" : resolution.failure).toContain(
        "❌ Unable to parse ISSUE_LABELS as JSON: ",
      );
    });

    it("requires the labels document to be an array", () => {
      expect.hasAssertions();
      expect(
        service.resolveFromEnvironment({ body: "", labelsDocument: "{}" }),
      ).toStrictEqual({
        failure: "❌ Expected ISSUE_LABELS to be a JSON array",
        resolved: false,
      });
    });
  });

  describe("describeError", () => {
    it("reads an Error's message", () => {
      expect.hasAssertions();
      expect(service.describeError(new Error("broken"))).toBe("broken");
    });

    it("stringifies anything else", () => {
      expect.hasAssertions();
      expect(service.describeError("broken")).toBe("broken");
    });
  });
});
