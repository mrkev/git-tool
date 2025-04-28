import chalk from "chalk";
import { execAsync, spawnStep } from "../exec";

export async function ggSend(branchname: string, message: string) {
  const [currRaw] = await execAsync(`git rev-parse --abbrev-ref HEAD`);
  const currBranch = currRaw.trim();
  await spawnStep(`git checkout -b ${branchname}`);
  await spawnStep(`git commit -m "${message}"`);
  const [msg, err] = await execAsync(
    `git push --set-upstream origin ${branchname}`
  );

  // remote messages get printed to stderr for some reason
  const lines = err.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("Create a pull request for") === -1) {
      console.log(
        "out",
        lines[i],
        lines[i].indexOf("Create a pull request for")
      );

      continue;
    }
    const match = /(https?.*)\/pull\/new/gm.exec(lines[i + 1]);
    if (!match) {
      throw new Error("this isn't expected!");
    }
    console.log(
      `Create a pull request to ${chalk.green(currBranch)} <- ${chalk.green(
        branchname
      )}:`
    );
    console.log(
      "    " +
        chalk.underline(
          match[1] + `/compare/${currBranch}...${branchname}?expand=1\n`
        )
    );
    break;
  }
}
