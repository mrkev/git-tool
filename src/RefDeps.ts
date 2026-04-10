import { Repository } from "nodegit";
import { oidToRefMap, leastCommonAncestor, commitsBetween, refToOidMap, getTrunkRef } from "./branches";

export class RefDeps {
  repo: Repository;
  private _oidToRefs: Promise<Awaited<ReturnType<typeof oidToRefMap>>> | null = null;
  private _refToOid: Promise<Awaited<ReturnType<typeof refToOidMap>>> | null = null;
  private _trunkRef: Promise<Awaited<ReturnType<typeof getTrunkRef>>> | null = null;

  constructor(repo: Repository) {
    this.repo = repo;
  }

  private getOidToRefs() {
    if (!this._oidToRefs) this._oidToRefs = oidToRefMap(this.repo);
    return this._oidToRefs;
  }

  private getRefToOid() {
    if (!this._refToOid) this._refToOid = refToOidMap(this.repo);
    return this._refToOid;
  }

  private getTrunk() {
    if (!this._trunkRef) this._trunkRef = getTrunkRef(this.repo);
    return this._trunkRef;
  }

  async parentForBranch(branchName: string): Promise<{ hash: string; branchName: string | null }> {
    const [oidToRefs, , trunkRef] = await Promise.all([this.getOidToRefs(), this.getRefToOid(), this.getTrunk()]);

    const TRUNK = trunkRef.shorthand();
    const trunkOid = trunkRef.target().tostrS();

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

      // start at i=len-2 to skip the tip commit: the ref we're checking
      // i = 0 is TRUNK, so worst case we'll end on TRUNK and return that
      // as the parent.
      for (let i = commits.length - 2; i > 0; i--) {
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

  async childrenForDep(_ref: string): Promise<Array<string>> {
    return [];
  }
}
