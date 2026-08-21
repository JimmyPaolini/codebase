import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RunPlanService } from "./run-plan.service";

/** What `--check` says it accepts, quoted the way every message quotes it. */
const ACCEPTED =
  `It takes a comma-separated set drawn from "depth" and "reports", ` +
  `as in "--check depth,reports".`;

describe(RunPlanService, () => {
  let service: RunPlanService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RunPlanService],
    }).compile();

    service = await module.resolve(RunPlanService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ Reading the check set

  it("gates nothing when the flag is absent", () => {
    const { errors, mode } = service.selectMode({});

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksDepth: false,
      checksReports: false,
      writes: false,
    });
  });

  it("gates depth alone when depth alone was named", () => {
    const { errors, mode } = service.selectMode({ check: "depth" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(false);
  });

  it("gates staleness alone when reports alone was named", () => {
    const { mode } = service.selectMode({ check: "reports" });

    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(true);
  });

  it("gates both when both were named", () => {
    const { errors, mode } = service.selectMode({ check: "depth,reports" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("ignores the spaces somebody wrote around a name", () => {
    const { errors, mode } = service.selectMode({ check: " depth , reports " });

    expect(errors).toStrictEqual([]);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("refuses a flag carrying no value", () => {
    // Read as "gate everything" this used to be one flag over two findings,
    // which is the conflation the set exists to undo.
    const { errors, mode } = service.selectMode({ check: true });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(false);
  });

  it("refuses an empty value", () => {
    const { errors } = service.selectMode({ check: "" });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a value that is nothing but separators", () => {
    const { errors } = service.selectMode({ check: " , " });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a name it does not know, and names what it takes", () => {
    const { errors, mode } = service.selectMode({ check: "limits" });

    expect(errors).toStrictEqual([
      `--check does not accept "limits". ${ACCEPTED}`,
    ]);
    expect(mode.checksDepth).toBe(false);
  });

  it("reports every unknown name in one run", () => {
    const { errors } = service.selectMode({ check: "limits,stacks" });

    expect(errors).toHaveLength(2);
  });

  it("keeps the names it knows from a set that also holds one it does not", () => {
    const { errors, mode } = service.selectMode({ check: "depth,limits" });

    expect(errors).toHaveLength(1);
    expect(mode.checksDepth).toBe(true);
  });

  // ✍️ Writing

  it("writes when the write flag was given", () => {
    const { errors, mode } = service.selectMode({ write: true });

    expect(errors).toStrictEqual([]);
    expect(mode.writes).toBe(true);
  });

  it("does not write for a flag that was explicitly turned off", () => {
    const { mode } = service.selectMode({ write: false });

    expect(mode.writes).toBe(false);
  });

  it("writes and gates depth in one run", () => {
    const { errors, mode } = service.selectMode({
      check: "depth",
      write: true,
    });

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksDepth: true,
      checksReports: false,
      writes: true,
    });
  });

  it("refuses writing and checking reports at once", () => {
    const { errors } = service.selectMode({ check: "reports", write: true });

    expect(errors).toStrictEqual([
      `--write cannot be combined with --check reports: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check reports separately.`,
    ]);
  });

  // 📄 Touching files

  it("touches files when it writes", () => {
    expect(
      service.touchesFiles({
        checksDepth: false,
        checksReports: false,
        writes: true,
      }),
    ).toBe(true);
  });

  it("touches files when it compares them", () => {
    expect(
      service.touchesFiles({
        checksDepth: false,
        checksReports: true,
        writes: false,
      }),
    ).toBe(true);
  });

  it("leaves files alone when it only gates depth", () => {
    expect(
      service.touchesFiles({
        checksDepth: true,
        checksReports: false,
        writes: false,
      }),
    ).toBe(false);
  });
});
