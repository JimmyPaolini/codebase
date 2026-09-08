/**
 * A project that overrides nothing, written out all the same.
 *
 * Every value here is a default — the tool's own decorator list, its
 * entry-point switches, the depth the run supplies, and a section published
 * into this project's own guide. A real package writes the same statement as
 * `...projectDefaults` and one overridden field; this one spells it out
 * because the fields, not the terseness, are what it demonstrates.
 *
 * No type annotation, and so no import — the convention every real package's
 * file follows, and here it is load-bearing: even a type-only import makes
 * this project's program resolve `@callidescope/configuration`, which pulls
 * that whole package into the closure this fixture is meant to trace alone.
 *
 * There is nothing left to inherit. A project used to be able to write no file
 * at all and take every number from the run, and this fixture was that case;
 * now a traced project with no file is a refusal, and what a project takes
 * from the workspace it takes by spreading the workspace's defaults into its
 * own file, where a reader can see them.
 *
 * @see docs/adr/0007-complete-project-configurations.md — the rule, and what
 * it replaced
 */
export default {
  entryPoints: {
    addresses: [],
    /** The tool's own list, for the same reason nothing here is imported. */
    decorators: [
      "Command",
      "Cron",
      "Delete",
      "Get",
      "Mutation",
      "OnEvent",
      "Option",
      "Patch",
      "Post",
      "Put",
      "Query",
      "ResolveField",
      "SubscribeMessage",
    ],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: false,
  },
  exclude: [],
  limits: {
    /**
     * No breadth limit, said outright.
     *
     * `undefined` written here is this project stating that it gates depth and
     * not breadth. The field could once be left out to say the same thing,
     * which is exactly the ambiguity completeness removes: an absent field and
     * a project that forgot looked identical.
     */
    maximumBreadth: undefined,
    /** Six, the number `callidescope.workspace.config.ts` supplies. */
    maximumDepth: 6,
  },
  write: {
    /** The `## 🔭 Callidescope` section at the bottom of this project's guide. */
    markdown: {
      heading: "## 🔭 Callidescope",
      path: "README.md",
    },
    /** No diagram: the package around this one publishes the run's. */
    mermaid: undefined,
  },
};
