export interface BranchConfig {
  baseBranches: string[];
  createTag: boolean;
  deleteAfterMerge: boolean;
  tagPrefix?: string;
}