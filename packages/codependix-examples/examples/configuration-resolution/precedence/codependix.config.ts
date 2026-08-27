/**
 * The TypeScript configuration file, which wins over the JSON one beside it
 * because `CONFIGURATION_FILE_NAMES` searches for it first.
 */
export default {
  defaults: {
    nx: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
  include: ["packages/*", "codependix-*"],
};
