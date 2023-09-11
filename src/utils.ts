import { execAsync } from "./exec";

export async function isRebasing() {
  try {
    await execAsync(`git rebase --show-current-patch`);
  } catch (e) {
    return false;
  }
  return true;
}

// gh api /repos/mrkev/git-tool
// git remote show origin | grep "HEAD branch" | sed 's/.*: //'
// https://stackoverflow.com/questions/28666357/how-to-get-default-git-branch
export function mainBranchName(): string {
  return `main`;
}

// gg share with `gh api /repos/mrkev/git-tool` to get repo URL?
