import { MermaidReportService, ReportService } from "@callidescope/output";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildSourceLocation, buildStackFrame } from "../../../testing/mocks";

import { AddressReportService } from "./address-report.service";

import type { CallAddressTreeResult } from "@callidescope/graph";

describe(AddressReportService, () => {
  let service: AddressReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AddressReportService, MermaidReportService, ReportService],
    }).compile();

    service = await module.resolve(AddressReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🔭 Depth

  it("renders no paths above or below as 'None.'", () => {
    const empty: CallAddressTreeResult = { stacks: [], truncated: false };
    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward: empty,
      format: "markdown",
      upward: empty,
    });

    expect(rendered).toContain("### Above (0)");
    expect(rendered).toContain("### Below (0)");
    expect(rendered).toContain("None.");
  });

  it("renders every downward and upward path as a fenced tree", () => {
    const downward: CallAddressTreeResult = {
      stacks: [
        {
          frames: [
            buildStackFrame({ displayName: "Foo.bar" }),
            buildStackFrame({ displayName: "Foo.baz" }),
          ],
          isLowerBound: false,
        },
      ],
      truncated: false,
    };
    const upward: CallAddressTreeResult = {
      stacks: [
        {
          frames: [buildStackFrame({ displayName: "Entry.run" })],
          isLowerBound: false,
        },
      ],
      truncated: false,
    };

    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward,
      format: "markdown",
      upward,
    });

    expect(rendered).toContain("# 🔭 Callidescope depth — `a.ts#Foo.bar`");
    expect(rendered).toContain("### Above (1)");
    expect(rendered).toContain("### Below (1)");
    expect(rendered).toContain("```text");
    expect(rendered).toContain("Foo.baz");
  });

  it("marks a path holding an unresolved call as a lower bound", () => {
    const downward: CallAddressTreeResult = {
      stacks: [
        {
          frames: [buildStackFrame({ displayName: "Foo.bar" })],
          isLowerBound: true,
        },
      ],
      truncated: false,
    };
    const empty: CallAddressTreeResult = { stacks: [], truncated: false };

    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward,
      format: "markdown",
      upward: empty,
    });

    expect(rendered).toContain("depth ≥ 0");
  });

  it("marks a truncated direction with a '+'", () => {
    const downward: CallAddressTreeResult = {
      stacks: [
        {
          frames: [buildStackFrame({ displayName: "Foo.bar" })],
          isLowerBound: false,
        },
      ],
      truncated: true,
    };
    const empty: CallAddressTreeResult = { stacks: [], truncated: false };

    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward,
      format: "markdown",
      upward: empty,
    });

    expect(rendered).toContain("### Below (1+)");
  });

  it("draws a diagram for each direction when the format asks for mermaid", () => {
    const withOneFrame: CallAddressTreeResult = {
      stacks: [
        {
          frames: [buildStackFrame({ displayName: "Foo.bar" })],
          isLowerBound: false,
        },
      ],
      truncated: false,
    };

    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward: withOneFrame,
      format: "mermaid",
      upward: withOneFrame,
    });

    expect(rendered).toContain("## Above");
    expect(rendered).toContain("## Below");
    expect(rendered.match(/```mermaid/g)).toHaveLength(2);
  });

  it("renders json holding both directions", () => {
    const empty: CallAddressTreeResult = { stacks: [], truncated: false };

    const rendered = service.renderDepth({
      address: "a.ts#Foo.bar",
      downward: empty,
      format: "json",
      upward: empty,
    });

    expect(JSON.parse(rendered)).toStrictEqual({
      above: empty,
      address: "a.ts#Foo.bar",
      below: empty,
    });
  });

  // 🌐 Breadth

  it("renders empty callee and caller tables as 'None.'", () => {
    const rendered = service.renderBreadth({
      address: "a.ts#Foo.bar",
      directCalls: { callees: [], callers: [] },
      displayName: "Foo.bar",
      format: "markdown",
      id: "a#0",
      location: buildSourceLocation(),
    });

    expect(rendered).toContain("### Callees (0)");
    expect(rendered).toContain("### Callers (0)");
    expect(rendered).toContain("None.");
  });

  it("renders a row for every callee and caller", () => {
    const rendered = service.renderBreadth({
      address: "a.ts#Foo.bar",
      directCalls: {
        callees: [
          {
            displayName: "Foo.baz",
            id: "a#1",
            location: buildSourceLocation({ line: 5 }),
          },
        ],
        callers: [
          {
            displayName: "Entry.run",
            id: "a#2",
            location: buildSourceLocation({ line: 9 }),
          },
        ],
      },
      displayName: "Foo.bar",
      format: "markdown",
      id: "a#0",
      location: buildSourceLocation(),
    });

    expect(rendered).toContain("Foo.baz");
    expect(rendered).toContain("Entry.run");
  });

  it("draws the target, its callees, and its callers in one diagram", () => {
    const rendered = service.renderBreadth({
      address: "a.ts#Foo.bar",
      directCalls: {
        callees: [
          {
            displayName: "Foo.baz",
            id: "a#1",
            location: buildSourceLocation(),
          },
        ],
        callers: [
          {
            displayName: "Entry.run",
            id: "a#2",
            location: buildSourceLocation(),
          },
        ],
      },
      displayName: "Foo.bar",
      format: "mermaid",
      id: "a#0",
      location: buildSourceLocation(),
    });

    expect(rendered).toContain("```mermaid");
    expect(rendered).toContain("Foo.bar");
    expect(rendered).toContain("Foo.baz");
    expect(rendered).toContain("Entry.run");
  });

  it("renders json holding both direct callees and callers", () => {
    const directCalls = {
      callees: [
        { displayName: "Foo.baz", id: "a#1", location: buildSourceLocation() },
      ],
      callers: [],
    };

    const rendered = service.renderBreadth({
      address: "a.ts#Foo.bar",
      directCalls,
      displayName: "Foo.bar",
      format: "json",
      id: "a#0",
      location: buildSourceLocation(),
    });

    expect(JSON.parse(rendered)).toStrictEqual({
      address: "a.ts#Foo.bar",
      callable: "Foo.bar",
      ...directCalls,
    });
  });
});
