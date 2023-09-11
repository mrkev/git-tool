import { execAsync, spawnStep } from "../exec";
import { isRebasing, mainBranchName } from "../utils";

export async function ggAmend() {
  const rebasing = await isRebasing();
  if (rebasing) {
    console.log("REBASE IN PROGRESS");
    return;
  } else {
    await spawnStep(`git commit --amend && git push --force`);
  }
}

export async function ggGo(message: string) {
  // TODO: make sure to exit if sync fails!
  await ggSync();
  await spawnStep(`git commit -m "${message}"`);
  await spawnStep(`git push`);
}

export async function ggSync() {
  const main = mainBranchName();
  await spawnStep(`git checkout master`);
  await spawnStep(`git pull`);
  // await ggDelmerged();
}

export async function ggDelmerged() {
  let result, err;
  // cleans local refs for merged branches
  [result, err] = await execAsync(
    `git branch --merged` +
      ` | egrep -v "(^\*|master|main|dev)"` +
      ` | xargs git branch -d`
  );
  process.stdout.write(result);
  process.stderr.write(err);

  // cleans remote refs for deleted or merged ? branches
  [result, err] = await execAsync(`gh remote prune origin`);
  process.stdout.write(result);
  process.stderr.write(err);
}

// git branch -m master main
// open https://github.com/mrkev/git-tool/settings
// git push origin --delete master
