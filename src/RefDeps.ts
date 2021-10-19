import { Repository } from "nodegit";
import {
  oidToRefMap,
  leastCommonAncestor,
  commitsBetween,
  refToOidMap,
} from "./branches";

const TRUNK = "main";

export class RefDeps {
  repo: Repository;
  constructor(repo: Repository) {
    this.repo = repo;
  }

  async parentForBranch(
    branchName: string
  ): Promise<{ hash: string; branchName: string | null }> {
    const repo = this.repo;
    const oidToRefs = await oidToRefMap(this.repo);
    const refToOid = await refToOidMap(this.repo);

    const headRef = await this.repo.head();
    const head = headRef.shorthand();

    const trunkOid = (await repo.getReference(TRUNK)).target().tostrS();

    // if we're on TRUNK we return trunk. We don't really care for
    // showing previously merged branches which are now on trunk, at least for
    // now, and at least in this method
    if (branchName === TRUNK) {
      return { hash: trunkOid, branchName: TRUNK };
    }

    const ancestorWithTrunkOid = await leastCommonAncestor(TRUNK, branchName);

    // Branch is rebased on top of trunk. If no commits in between are branches,
    // the parent is trunk.
    if (ancestorWithTrunkOid === trunkOid) {
      const commits = await commitsBetween(branchName, TRUNK);

      console.log(commits);

      // start at i=len-2 to skip the tip commit: the ref we're checking
      // i = 0 is TRUNK, so worst case we'll end on TRUNK and return that
      // as the parent.
      for (let i = commits.length - 2; i > 0; i--) {
        console.log("iii", i);
        const commit = commits[i];
        const refs = oidToRefs.get(commit);
        if (refs) {
          // I can have multiple branches pointing at the same commit.
          // TODO: We should just return the commit and worry about this at
          // display time but for now I'll just return the first branch
          return {
            hash: refs[0].target().tostrS(),
            branchName: refs[0].shorthand(),
          };
        }
      }

      return { hash: trunkOid, branchName: TRUNK };
    }

    // Branch is not rebased on top of trunk. This means it could very well be
    // on top of some random unnamed commit. I have to figure out what to return
    // here. I guess just the commit?
    return { hash: ancestorWithTrunkOid, branchName: null };
  }

  async childrenForDep(ref: string): Promise<Array<string>> {
    return [];
  }
}
