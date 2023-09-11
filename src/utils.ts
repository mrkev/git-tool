import { execAsync } from "./exec";

export async function isRebasing() {
  try {
    await execAsync(`git rebase --show-current-patch`);
  } catch (e) {
    return false;
  }
  return true;
}

export function mainBranchName(): string {
  return `main`;
}
