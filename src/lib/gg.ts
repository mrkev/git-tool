import { execAsync } from "../exec";
import { defaultBranch } from "./branch";

export async function ggDelmerged() {
  const main = defaultBranch();

  let result, err;

  // cleans local refs for merged branches
  [result, err] = await execAsync(
    `git branch --merged` + ` | egrep -v "(^\*|master|main|dev)"` + ` | xargs git branch -d`,
  );
  process.stdout.write(result);
  process.stderr.write(err);

  // cleans remote refs for deleted or merged ? branches
  [result, err] = await execAsync(`git remote prune origin`);
  process.stdout.write(result);
  process.stderr.write(err);
}

// git branch -m master main
// open https://github.com/mrkev/git-tool/settings
// git push origin --delete master

////////////////////////////////
// 1 #!/bin/bash
// 2 # cleans the local refs (branches)
// 3 git branch --merged | egrep -v "(^\*|master|main|dev)" | xargs git branch -d
// 4 # cleans the remote refs
// 5 git remote prune origin
// 6 # https://stackoverflow.com/questions/7726949/remove-tracking-branches-no-longer-on-remote
// 7 git fetch -p && for branch in $(git for-each-ref --format '%(refname) %(upstream:track)' refs/heads | awk '$2 == "[gone]" {sub("refs/heads/", "", $1); print $1}'); do git branch -D $branch; done
// 8
// ~
// ~
// ~
// ~
