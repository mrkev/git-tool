import { $ } from "execa";
import { nullthrows } from "./nullthrows";

// apparently this is the best method
// https://stackoverflow.com/questions/28666357/how-to-get-default-git-branch
const HEAD_BRANCH_REGEX = /^\s*HEAD branch: (.*)$/m;
export async function defaultBranch() {
  const { stdout: remote } = await $`git remote`;
  const { stdout: remoteShow } = await $`git remote show ${remote}`;
  return nullthrows(
    HEAD_BRANCH_REGEX.exec(remoteShow),
    "failed to find default branch: no HEAD branch."
  )[1].trim();
}

export async function currentBranch() {
  const { stdout: branch } = await $`git rev-parse --abbrev-ref HEAD`;
  return branch.trim();
}
