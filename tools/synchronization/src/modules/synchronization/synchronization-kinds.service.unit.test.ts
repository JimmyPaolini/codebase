import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SynchronizationKindsService } from "./synchronization-kinds.service";

/** What `--kinds` says it accepts, quoted the way every message quotes it. */
const ACCEPTED =
  `It takes a comma-separated set drawn from "derivation", "report", and ` +
  `"repository", as in "--kinds derivation,report,repository".`;

describe(SynchronizationKindsService, () => {
  let service: SynchronizationKindsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SynchronizationKindsService],
    }).compile();

    service = await module.resolve(SynchronizationKindsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("selects every kind when the flag is absent", () => {
    const { errors, kinds } = service.select(undefined);

    expect(errors).toStrictEqual([]);
    expect([...kinds]).toStrictEqual(["derivation", "report", "repository"]);
  });

  it("selects one kind when one was named", () => {
    const { errors, kinds } = service.select("derivation");

    expect(errors).toStrictEqual([]);
    expect([...kinds]).toStrictEqual(["derivation"]);
  });

  it("selects every kind that was named", () => {
    const { kinds } = service.select("derivation,report,repository");

    expect([...kinds]).toStrictEqual(["derivation", "report", "repository"]);
  });

  // The kind whose destination is GitHub rather than a file, so nothing that
  // runs without a token may ever select it by accident.
  it("selects the repository kind on its own", () => {
    const { errors, kinds } = service.select("repository");

    expect(errors).toStrictEqual([]);
    expect([...kinds]).toStrictEqual(["repository"]);
  });

  // "report" is a prefix of "repository", so a set naming one must never be
  // read as naming the other.
  it("keeps report and repository apart", () => {
    expect([...service.select("report").kinds]).toStrictEqual(["report"]);
    expect([...service.select("repository").kinds]).toStrictEqual([
      "repository",
    ]);
  });

  it("ignores the spaces somebody wrote around a name", () => {
    const { errors, kinds } = service.select(" derivation , report ");

    expect(errors).toStrictEqual([]);
    expect([...kinds]).toStrictEqual(["derivation", "report"]);
  });

  it("refuses a flag carrying no value", () => {
    // Read as "every kind" it would publish reports from a pull request; read
    // as "none" it would report success over a synchronization nobody ran.
    const { errors, kinds } = service.select(true);

    expect(errors).toStrictEqual([`--kinds needs a value. ${ACCEPTED}`]);
    expect([...kinds]).toStrictEqual([]);
  });

  it("refuses an empty value", () => {
    const { errors, kinds } = service.select("");

    expect(errors).toStrictEqual([`--kinds needs a value. ${ACCEPTED}`]);
    expect([...kinds]).toStrictEqual([]);
  });

  it("refuses a value that is nothing but separators", () => {
    const { errors } = service.select(" , ");

    expect(errors).toStrictEqual([`--kinds needs a value. ${ACCEPTED}`]);
  });

  it("refuses a name it does not know, and names what it takes", () => {
    const { errors, kinds } = service.select("reports");

    expect(errors).toStrictEqual([
      `--kinds does not accept "reports". ${ACCEPTED}`,
    ]);
    expect([...kinds]).toStrictEqual([]);
  });

  it("reports every unknown name in one run", () => {
    const { errors } = service.select("reports,derivations");

    expect(errors).toHaveLength(2);
  });

  it("keeps the name it knows from a set that also holds one it does not", () => {
    const { errors, kinds } = service.select("derivation,reports");

    expect(errors).toHaveLength(1);
    expect([...kinds]).toStrictEqual(["derivation"]);
  });
});
