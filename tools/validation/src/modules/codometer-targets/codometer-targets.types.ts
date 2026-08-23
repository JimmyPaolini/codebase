// 🏷️ Types

/** One project the codometer target policy covers. */
export interface CodometerProject {
  directory: string;
  packageManifestPath: string;
  projectManifestPath: string;
}

/** Every project's codometer target policy verdict. */
export interface CodometerTargetsVerdict {
  missingTargets: string[];
  ungatedProjects: string[];
}

/** As much of a `package.json` as this policy reads. */
export interface PackageManifest {
  sizeLimit?: unknown;
}

/** As much of a `project.json` as this policy reads. */
export interface ProjectManifest {
  targets?: Record<string, unknown>;
}
