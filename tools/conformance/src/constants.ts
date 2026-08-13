import { z } from "zod";

export const APPLICATIONS_DIRECTORY = "applications";
export const PACKAGES_DIRECTORY = "packages";
export const TOOLS_DIRECTORY = "tools";
export const MODULES_DIRECTORY = "src/modules";

const TEMPLATE_PATTERN = "tools/conformance/src/modules/*/templates/**";
const CONFORMANCE_INSTANCE_DIRECTORIES = [
  APPLICATIONS_DIRECTORY,
  PACKAGES_DIRECTORY,
  TOOLS_DIRECTORY,
] as const;
const MODULES_INSTANCE_PATTERNS = CONFORMANCE_INSTANCE_DIRECTORIES.map(
  (directoryName) => `${directoryName}/**/${MODULES_DIRECTORY}/**`,
);
const INSTANCE_PATTERNS = CONFORMANCE_INSTANCE_DIRECTORIES.map(
  (directoryName) => `${directoryName}/**`,
);

export const CONFORMANCE_PATTERNS = [
  TEMPLATE_PATTERN,
  ...MODULES_INSTANCE_PATTERNS,
  ...INSTANCE_PATTERNS,
] as const;

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});
