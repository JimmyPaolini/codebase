import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DataSourceOptions } from "typeorm";

type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: "postgres" }
>;

function toPostgresDataSourceOptions(
  dataSourceOptions: DataSourceOptions,
): PostgresDataSourceOptions {
  if (dataSourceOptions.type !== "postgres") {
    throw new Error("Expected postgres data source options.");
  }

  return dataSourceOptions;
}

describe("lexico data source", () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    delete process.env["POSTGRES_DB"];
    delete process.env["POSTGRES_HOST"];
    delete process.env["POSTGRES_PASSWORD"];
    delete process.env["POSTGRES_PORT"];
    delete process.env["POSTGRES_USER"];
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.resetModules();
  });

  it("should use default postgres configuration values", async () => {
    const { lexicoDataSource } = await import("./data-source.constants");
    const postgresDataSourceOptions = toPostgresDataSourceOptions(
      lexicoDataSource.options,
    );

    expect(postgresDataSourceOptions.type).toBe("postgres");
    expect(postgresDataSourceOptions.database).toBe("postgres");
    expect(postgresDataSourceOptions.host).toBe("localhost");
    expect(postgresDataSourceOptions.password).toBe("postgres");
    expect(postgresDataSourceOptions.username).toBe("postgres");
    expect(postgresDataSourceOptions.port).toBe(5432);
  });

  it("should use environment postgres configuration values", async () => {
    process.env["POSTGRES_DB"] = "custom_database";
    process.env["POSTGRES_HOST"] = "database.internal";
    process.env["POSTGRES_PASSWORD"] = "custom_password";
    process.env["POSTGRES_PORT"] = "6001";
    process.env["POSTGRES_USER"] = "custom_user";

    const { lexicoDataSource } = await import("./data-source.constants");
    const postgresDataSourceOptions = toPostgresDataSourceOptions(
      lexicoDataSource.options,
    );

    expect(postgresDataSourceOptions.database).toBe("custom_database");
    expect(postgresDataSourceOptions.host).toBe("database.internal");
    expect(postgresDataSourceOptions.password).toBe("custom_password");
    expect(postgresDataSourceOptions.username).toBe("custom_user");
    expect(postgresDataSourceOptions.port).toBe(6001);
  });
});
