import { $ } from "execa";

// Uses the local symbolic ref that git sets on clone to point to the remote's default branch.
// Purely local (no network call), so it's fast and works offline.
// If the ref is missing (eg. `git init` + `git remote add`), fix with: `git remote set-head origin --auto`
export async function defaultBranch() {
  const { stdout } = await $`git symbolic-ref refs/remotes/origin/HEAD`;
  return stdout.trim().replace(/^refs\/remotes\/origin\//, "");
}

export async function currentBranch() {
  const { stdout: branch } = await $`git rev-parse --abbrev-ref HEAD`;
  return branch.trim();
}
