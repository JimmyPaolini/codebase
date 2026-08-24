import { type CodependixConfiguration } from "@codependix/configuration";

/**
 * Every project in the workspace gets a JSON export of its own Nx Neighborhood,
 * NestJS module graph, and file-level import graph — the same "cover the whole
 * repository by default" philosophy `codometer.config.ts` and
 * `callidescope.config.ts` both follow, rather than an explicit include list
 * that would need a new entry every time a project is added.
 *
 * JSON needs nothing placed by hand, so it is safe to default broadly: a
 * project that is not a NestJS project or carries no `tsconfig.json` simply
 * never appears in that graph type's results (see `NestjsProjectService` and
 * `TypescriptProjectService`), so `target: "json"` here costs nothing for a
 * project it does not apply to.
 *
 * Markdown is different — `AnchorsService` treats a missing anchor block as an
 * error in both `--check` and `--write` rather than creating one, exactly so
 * that placing a Markdown export stays a deliberate, per-file decision. Only
 * the handful of projects below carry a `<!-- codependix:start -->` block in
 * their README.md, and only those are opted into Markdown via `projects`.
 */
const codependixConfiguration: CodependixConfiguration = {
  defaults: {
    imports: {
      json: { path: "codependix-imports-graph.json" },
      target: "json",
    },
    nestjs: {
      json: { path: "codependix-nestjs-graph.json" },
      target: "json",
    },
    nx: {
      json: { path: "codependix-nx-graph.json" },
      target: "json",
    },
  },
  projects: {
    "codependix-cli": {
      imports: {
        json: { path: "codependix-imports-graph.json" },
        markdown: { anchor: "codependix-imports" },
        target: "both",
      },
      nestjs: {
        json: { path: "codependix-nestjs-graph.json" },
        markdown: { anchor: "codependix-nestjs" },
        target: "both",
      },
      nx: {
        json: { path: "codependix-nx-graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
    "codometer-cli": {
      imports: {
        json: { path: "codependix-imports-graph.json" },
        markdown: { anchor: "codependix-imports" },
        target: "both",
      },
      nestjs: {
        json: { path: "codependix-nestjs-graph.json" },
        markdown: { anchor: "codependix-nestjs" },
        target: "both",
      },
      nx: {
        json: { path: "codependix-nx-graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
    lexico: {
      imports: {
        json: { path: "codependix-imports-graph.json" },
        markdown: { anchor: "codependix-imports" },
        target: "both",
      },
      nx: {
        json: { path: "codependix-nx-graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
    logger: {
      imports: {
        json: { path: "codependix-imports-graph.json" },
        markdown: { anchor: "codependix-imports" },
        target: "both",
      },
      nestjs: {
        json: { path: "codependix-nestjs-graph.json" },
        markdown: { anchor: "codependix-nestjs" },
        target: "both",
      },
      nx: {
        json: { path: "codependix-nx-graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
    validation: {
      imports: {
        json: { path: "codependix-imports-graph.json" },
        markdown: { anchor: "codependix-imports" },
        target: "both",
      },
      nestjs: {
        json: { path: "codependix-nestjs-graph.json" },
        markdown: { anchor: "codependix-nestjs" },
        target: "both",
      },
      nx: {
        json: { path: "codependix-nx-graph.json" },
        markdown: { anchor: "codependix-nx" },
        target: "both",
      },
    },
  },
  workspace: {
    nx: {
      json: { path: "codependix-workspace-graph.json" },
      markdown: { anchor: "codependix-workspace" },
      target: "both",
    },
  },
};

export default codependixConfiguration;
