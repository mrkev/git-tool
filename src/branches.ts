import nodegit, { Reference, Repository } from "nodegit";
import { execAsync } from "./exec";

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

// branch -> commit
export async function refToOidMap(
  repo: Repository
): Promise<Map<string, Reference[]>> {
  const refs = await repo.getReferences();
  const result = new Map();
  for (const ref of refs) {
    const oid = ref.target().tostrS();
    result.set(ref, oid);
  }
  return result;
}

export async function getTrunkRef(repo: Repository): Promise<Reference> {
  return await Promise.resolve()
    .then(() => repo.getReference("dev"))
    .catch(() => repo.getReference("main"))
    .catch(() => repo.getReference("master"));
}

export async function commitsBetween(tip: string, base: string) {
  const [stdout] = await execAsync(
    `git rev-list --ancestry-path ${base}..${tip}`
  );

  // If branch returns hash, if hash returns hash
  const [baseHash] = await execAsync(`git rev-parse ${base}`);

  // Result includes (base..tip] (ie, doesn't include base) and is
  // in reverse chronological order. Let's address these two aspects.
  const result = stdout.split("\n").filter((s) => s.trim() !== "");
  result.push(baseHash.trim());
  result.reverse();

  // result is [base, ..., tip]
  return result;
}

export async function commonAncestorExists(
  possibleAncestor: string,
  commit: string
) {
  // TODO: status code 0 is yes, 1 is no iirc. get status code!
  const [stdout, stderr] = await execAsync(
    `git merge-base --is-ancestor ${possibleAncestor} ${commit}`
  );
}

// returns a hash
export async function leastCommonAncestor(hash1: string, hash2: string) {
  const [stdout, stderr] = await execAsync(`git merge-base ${hash1} ${hash2}`);
  return stdout.trim();
}
