import nodegit from "nodegit";
const { Merge, Revparse, Revwalk } = nodegit;
type Reference = nodegit.Reference;
type Repository = nodegit.Repository;

export async function localBranches(repo: Repository, refs?: Reference[]): Promise<Reference[]> {
  const allRefs = refs ?? (await repo.getReferences());
  // isBranch returns 1 when git reference lives in the refs/heads
  // therefore, local branches only
  const branches = allRefs.filter((ref) => ref.isBranch() == 1);
  return branches;
}

// commit -> branch
export async function oidToRefMap(repo: Repository, refs?: Reference[]): Promise<Map<string, Reference[]>> {
  const allRefs = refs ?? (await repo.getReferences());
  const result = new Map();
  for (const ref of allRefs) {
    const oid = ref.target().tostrS();
    if (result.has(oid)) {
      result.get(oid).push(ref);
    } else {
      result.set(oid, [ref]);
    }
  }
  return result;
}

export async function getTrunkRef(repo: Repository): Promise<Reference> {
  return await Promise.resolve()
    .then(() => repo.getReference("dev"))
    .catch(() => repo.getReference("main"))
    .catch(() => repo.getReference("master"));
}

export async function commitsBetween(repo: Repository, tip: string, base: string) {
  const tipObj = await Revparse.single(repo, tip);
  const baseObj = await Revparse.single(repo, base);

  const walk = Revwalk.create(repo);
  walk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.REVERSE);
  walk.push(tipObj.id());
  walk.hide(baseObj.id());

  const commits = await walk.commitWalk(1000);
  // result is [base, ..., tip] — walk excludes base, so prepend it
  const result = [baseObj.id().tostrS(), ...commits.map((entry: any) => entry.oid ? entry.oid.tostrS() : entry.id().tostrS())];
  return result;
}

export async function commonAncestorExists(repo: Repository, possibleAncestor: string, commit: string) {
  return await nodegit.Graph.descendantOf(repo, (await Revparse.single(repo, commit)).id(), (await Revparse.single(repo, possibleAncestor)).id());
}

// returns a hash
export async function leastCommonAncestor(repo: Repository, hash1: string, hash2: string) {
  const oid1 = (await Revparse.single(repo, hash1)).id();
  const oid2 = (await Revparse.single(repo, hash2)).id();
  const resultOid = await Merge.base(repo, oid1, oid2);
  return resultOid.tostrS();
}
