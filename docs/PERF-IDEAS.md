# gg-branch Performance: Future Optimization Ideas

These are larger changes that could further improve `gg branch` performance beyond the easy/medium optimizations already applied.

## 1. Cache parent-branch relationships

Branch parentage (computed via `RefDeps.parentForBranch`) doesn't change unless someone rebases, creates, or deletes branches. The ancestry walk is the most expensive part of `showBranchList`.

**Approach:** Write a cache file (e.g., `.git/gg-parent-cache.json`) mapping `branchName -> { parentBranch, parentHash }`. Invalidate when:
- Any ref under `refs/heads/` changes (compare ref timestamps or a hash of all ref targets)
- The cache file doesn't exist

**Expected impact:** Eliminates all `Merge.base` and `Revwalk` calls on repeat runs. First run is unchanged, subsequent runs skip the most expensive work entirely.

**Complexity:** Need to handle invalidation correctly. A stale cache showing wrong parents is worse than being slow.

## 2. Lazy-load parent info for off-screen branches

The interactive list has `pageSize: 20`, but `parentForBranch` is computed for every branch upfront. With 50+ branches, most of that work is never seen.

**Approach:** Render the initial page without parent info (or with a placeholder), then compute parents lazily as the user scrolls. This requires changes to `CustomListPrompt` to support async choice updates.

**Expected impact:** Reduces startup time proportionally to `(pageSize / totalBranches)`. With 50 branches, roughly 60% less work at startup.

**Complexity:** Requires modifying the custom inquirer prompt to support deferred rendering. The prompt would need to re-render choices as parent data arrives.

## 3. Drop nodegit for reads, use git CLI exclusively

Since mutations already shell out to git, the read path could too. A single `git for-each-ref --sort=-committerdate --format='%(objectname) %(refname:short) %(committerdate:iso) %(subject)' refs/heads/` replaces `localBranches()` + N `Commit.lookup` calls with one subprocess.

**Approach:**
- Replace `localBranches` + per-branch `Commit.lookup` with `git for-each-ref`
- Replace `repo.getStatus()` with `git status --porcelain`
- Remove nodegit as a dependency entirely

**Expected impact:** Eliminates native module compilation on install (major DX win), removes libgit2 overhead. Total subprocess count would be ~3 (for-each-ref, status, merge-base batched) instead of N+3 libgit2 calls.

**Complexity:** Large refactor touching most files. Would need to rework `RefDeps`, `repo.ts`, `status.ts`, and all commands. Biggest benefit is eliminating the fragile nodegit native build.

## 4. Batch merge-base computation

Instead of calling `Merge.base` once per branch, compute all merge-bases in a single pass.

**Approach:** Use `git merge-base --octopus` or walk the commit graph once with a multi-target revwalk to find where each branch diverges from trunk.

**Expected impact:** Reduces N merge-base lookups to 1 graph traversal.

**Complexity:** Moderate. The octopus merge-base has different semantics. A custom graph walk using `Revwalk` that tracks multiple branch tips simultaneously would be more correct but more code.
