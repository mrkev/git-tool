import nodegit, { Reference, Repository } from "nodegit";

export async function localBranches(repo: Repository): Promise<Reference[]> {
  const refs = await repo.getReferences();
  // isBranch returns 1 when git reference lives in the refs/heads
  // therefore, local branches only
  const branches = refs.filter((ref) => ref.isBranch() == 1);
  return branches;
}

// commit -> branch
export async function oidToRefMap(
  repo: Repository
): Promise<Map<string, Reference[]>> {
  const refs = await repo.getReferences();
  const result = new Map();
  for (const ref of refs) {
    const oid = ref.target().tostrS();
    if (result.has(oid)) {
      result.get(oid).push(ref);
    } else {
      result.set(oid, [ref]);
    }
  }
  return result;
}
