/**
 * Carries a field no released codependix has an opinion about.
 *
 * Zod strips unknown keys rather than rejecting them, so this still loads.
 */
export default {
  defaults: {
    nx: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
  graphqlSchemas: { target: "markdown" },
};
