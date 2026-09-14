/**
 * Sits at the fixture workspace root, which the upward search reaches past a
 * nested project's own `package.json`.
 */
export default {
  defaults: {
    nx: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
  projects: {
    "atlas-service": {
      nx: { json: { path: "codependix-nx-graph.json" }, target: "json" },
    },
  },
};
