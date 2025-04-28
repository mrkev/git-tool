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

// gg share with `gh api /repos/mrkev/git-tool` to get repo URL?
