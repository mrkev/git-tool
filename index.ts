#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import nodegit, { Reference } from "nodegit";
import TimeAgo from "javascript-time-ago";
import chalk from "chalk";
import en from "javascript-time-ago/locale/en";
import { exec } from "child_process";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const program = new Command();
program.version("0.0.1");

program
  .command("branch [branch]")
  .description("branch a branch/commit")
  .action(async (branch) => {
    const repo = await getRepo();
    if (branch == null) {
      const statusText = await getStatusText(repo);
      if (statusText.length) {
        console.log(chalk.dim("Changes not staged for commit:"));
        console.log(statusText.map((text) => `    ${text}`).join("\n"), "\n");
      }

      await showBranchList(repo);
      return;
    }

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

    exec(`git checkout ${branch}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      process.stdout.write(stdout);
      process.stderr.write(stderr);
    });
  });

program
  .command("commit <branchname> <message>")
  .description("creates a branch/commit")
  .action((branchname, message) => {
    // if not on master:
    // git checkout -b new-branch
    // git commit -m "message"
  });

program
  .command("move <ref> <dest>")
  .description("rebases a commit/branch somewhere else")
  .action((ref, dest) => {
    // git checkout ref
    // git rebase dest
    // rebase branches dependant on this one?
  });

program
  .command("test ")
  .description("just testing stuff for development")
  .action(async () => {
    const repo = await getRepo();
    const statuses = await repo.getStatus();
    function statusToText(status: nodegit.StatusFile) {
      var words = [];
      if (status.isNew()) {
        words.push("NEW");
      }
      if (status.isModified()) {
        words.push("MODIFIED");
      }
      if (status.isTypechange()) {
        words.push("TYPECHANGE");
      }
      if (status.isRenamed()) {
        words.push("RENAMED");
      }
      if (status.isIgnored()) {
        words.push("IGNORED");
      }

      return words.join(" ");
    }

    statuses.forEach(function (file) {
      console.log(file.path() + " " + statusToText(file));
    });
  });

program.parse(process.argv);

async function getRepo(): Promise<nodegit.Repository> {
  const path = await nodegit.Repository.discover(
    process.cwd(),
    0,
    require("os").homedir()
  );
  const repo = await nodegit.Repository.open(path);
  return repo;
}

async function getStatusText(repo: nodegit.Repository): Promise<Array<string>> {
  const statuses = await repo.getStatus();
  function statusToText(status: nodegit.StatusFile): [string, chalk.Chalk] {
    const words = [];
    let color: chalk.Chalk = chalk.reset;
    if (status.isNew()) {
      words.push("NEW");
      color = chalk.green;
    }
    if (status.isModified()) {
      words.push("MODIFIED");
      color = chalk.yellow;
    }
    if (status.isTypechange()) {
      words.push("TYPECHANGE");
      color = chalk.magenta;
    }
    if (status.isRenamed()) {
      words.push("RENAMED");
      color = chalk.yellow;
    }
    if (status.isIgnored()) {
      words.push("IGNORED");
      color = chalk.red;
    }

    return [words.join(" "), color];
  }

  return statuses.map(function (file) {
    const [words, color] = statusToText(file);
    return color(file.path() + " " + words);
  });
}

async function localBranches(repo: nodegit.Repository): Promise<Reference[]> {
  const names = await nodegit.Reference.list(repo);
  const refs = await Promise.all(
    names.map((name) => nodegit.Reference.lookup(repo, name))
  );
  // isBranch returns 1 when the reference lives in the refs/heads
  // therefore, local branches only
  const branches = refs.filter((ref) => ref.isBranch() == 1);
  return branches;
}

async function showBranchList(repo: nodegit.Repository) {
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
          message: commit.message(),
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

  const choices = results.map(
    ({ sha: fullSha, date, shorthand, message, branch, isHead }) => {
      const h = isHead ? "*" : " ";
      const sha = chalk.dim(fullSha.substring(0, 5));
      const bname = chalk.green(shorthand);
      const tAgo = timeAgo
        .format(date)
        .replace("minutes", "mins")
        .padEnd(longestTimeLen);
      const msg = chalk.dim(message.trim());
      return {
        name: `${h} ${tAgo} ${sha} ${bname} ${msg}`,
        value: branch,
        short: shorthand,
      };
    }
  );

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "branch",
      message: "Branch to checkout:",
      choices,
      default: choices[headIndex].value,
    },
  ]);

  const branch: nodegit.Reference = answers.branch;
  try {
    await repo.checkoutBranch(branch);
  } catch (e) {
    console.error(e);
  }
}
