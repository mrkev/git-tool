import inquirer from "inquirer";
import chalk from "chalk";
import { exec } from "child_process";
import { localBranches } from "./branches";
import { getRepo } from "./repo";
import { getStatusText } from "./status";
import { EOL } from "os";
import { stripAnsi } from "./ansi";
import nodegit from "nodegit";
import en from "javascript-time-ago/locale/en";
import TimeAgo from "javascript-time-ago";
import CustomListPrompt from "./CustomListPrompt";

inquirer.registerPrompt("custom-list", CustomListPrompt);

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

/**
 * gg branch [branch]
 */
export async function ggBranch(branch: string | null) {
  const repo = await getRepo();

  // Show list
  if (branch == null) {
    const statusText = await getStatusText(repo);
    if (statusText.length) {
      console.log(chalk.dim("\nChanges not staged for commit:"));
      console.log(statusText.map((text) => `    ${text}`).join("\n"));
    }

    await showBranchList(repo);
    return;
  }

  // Create branch
  const branches = (await localBranches(repo)).map((branch) =>
    branch.shorthand()
  );

  if (branches.indexOf(branch) === -1) {
    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: `No branch named '${branch}'. Create one?`,
        default: false,
      },
    ]);

    if (create) {
      exec(`git checkout -b ${branch}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        process.stdout.write(stdout);
        process.stderr.write(stderr);
      });
    }

    return;
  }

  // Checkout branch
  exec(`git checkout ${branch}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  });
}

export async function showBranchList(repo: nodegit.Repository): Promise<void> {
  const locals = await localBranches(repo);

  const results = (
    await Promise.all(
      locals.map(async (branch) => {
        const oid = branch.target().tostrS();
        const commit = await nodegit.Commit.lookup(repo, oid);

        return {
          sha: oid,
          date: commit.date(),
          shorthand: branch.shorthand(),
          message: commit.message().trim().split(EOL)[0],
          isHead: branch.isHead(),
          branch,
        };
      })
    )
  ).sort(
    ({ date: date1 }, { date: date2 }) => date2.valueOf() - date1.valueOf()
  );

  let longestTimeLen = 0;
  let headIndex = 0;
  for (let i = 0; i < results.length; i++) {
    const { date, isHead } = results[i];
    const tAgo = timeAgo.format(date).replace("minutes", "mins");
    longestTimeLen =
      tAgo.length > longestTimeLen ? tAgo.length : longestTimeLen;
    if (isHead) {
      headIndex = i;
    }
  }

  const COLUMNS = process.stdout.columns;
  const COMMANDER_LIST_INDICATOR_LENGTH = 2;

  const choices = results.map(
    ({ sha: fullSha, date, shorthand, message, branch, isHead }) => {
      const h = isHead ? "*" : " ";
      const sha = chalk.dim(fullSha.substring(0, 5));
      const bname = chalk.green(shorthand);
      const tAgo = timeAgo
        .format(date)
        .replace("minutes", "mins")
        .padEnd(longestTimeLen);
      const msg = message.trim();

      let name = `${h} ${tAgo} ${sha} ${bname}`;

      const widthWithoutMsg =
        COMMANDER_LIST_INDICATOR_LENGTH + 1 + stripAnsi(name).length;

      if (COLUMNS - widthWithoutMsg > 5) {
        const spaceLeft = COLUMNS - widthWithoutMsg;
        name += " " + chalk.dim(msg.substring(0, spaceLeft - 1));
      }

      return {
        name: name,
        value: branch,
        short: shorthand,
      };
    }
  );

  const prompt = inquirer.prompt([
    {
      type: "custom-list",
      name: "branch",
      message: "on branch:",
      choices,
      default: choices[headIndex].value,
      pageSize: 20,
      loop: false,
    },
  ]);

  prompt.then(async function (answers) {
    const branch: nodegit.Reference = answers.branch;
    try {
      await repo.checkoutBranch(branch);
    } catch (e) {
      console.error(e);
    }
  });

  process.stdin.on("keypress", function (x) {
    if (x === "q") {
      (prompt.ui as any).close();
      console.log("\nCancelled by the user.");
    }
  });
}
