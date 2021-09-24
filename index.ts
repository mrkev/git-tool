#!/usr/bin/env node

import { Command } from "commander";
import nodegit from "nodegit";
import chalk from "chalk";
import { spawn } from "child_process";
import { execAsync } from "./src/exec";
import { oidToRefMap } from "./src/branches";
import { ggBranch } from "./src/gg-branch";
import { getRepo } from "./src/repo";

const program = new Command();
program.version("0.0.1");

program
  .command("branch [branch]")
  .alias("b")
  .description("branch a branch/commit")
  .action((branch?: string) => ggBranch(branch || null));

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
  .command("delmerged")
  .description("rebases a commit/branch somewhere else")
  .action(async (ref, dest) => {
    let result, err;
    // cleans local refs for merged branches
    [result, err] = await execAsync(
      `gh branch --merged` +
        ` | egrep -v "(^\*|master|main|dev)"` +
        ` | xargs git branch -d`
    );
    process.stdout.write(result);
    process.stderr.write(err);

    // cleans remote refs for deleted or merged ? branches
    [result, err] = await execAsync(`gh remote prune origin`);
    process.stdout.write(result);
    process.stderr.write(err);
  });

program
  .command("log")
  .description("git log clone")
  .action(async () => {
    // TODO: use revwalk to give this a limit
    const repo = await getRepo();

    const oidToRef = await oidToRefMap(repo);

    const headCommit = await repo.getHeadCommit();
    const currentBranchName = (await repo.getCurrentBranch()).name();

    // History returns an event.
    const history = headCommit.history();

    // History emits "commit" event for each commit in the branch's history
    history.on("commit", function (commit: nodegit.Commit) {
      const sha = commit.sha();
      const branches = oidToRef.has(commit.sha())
        ? oidToRef.get(sha)!.map((ref) => {
            let text = "";
            if (currentBranchName === ref.name()) {
              text += chalk.blue("HEAD -> ");
            }
            text += chalk.green(ref.shorthand());
            return text;
          })
        : [];

      const branchText = branches.length > 0 ? `(${branches.join(", ")})` : "";

      console.log(chalk.yellow("commit " + commit.sha()), branchText);

      console.log(
        "Author:",
        commit.author().name() + " <" + commit.author().email() + ">"
      );
      console.log("Date:", commit.date());
      console.log("\n    " + commit.message());
    });

    history.start();
  });

program
  .command("tree")
  .description("prints the branch tree")
  .action(async function () {
    spawn(
      "git",
      [
        "log",
        "--graph",
        "--pretty=format:%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset%n",
        "--abbrev-commit",
        "--date=relative",
        "--branches",
      ],
      { stdio: "inherit" }
    );
  });

program
  .command("pr")
  .description("WIP")
  .action(async function () {
    // TODO: do I need to think about pushing?
    const repo = await getRepo();
    const oidToRef = await oidToRefMap(repo);
    const [HEADmin1, err1] = await execAsync("git rev-parse HEAD^1");
    process.stderr.write(err1);
    const baseRef = oidToRef.get(HEADmin1);
    if (!baseRef || baseRef.length === 0) {
      throw new Error("Not on top of another branch");
    }
    const base = baseRef[0].shorthand();
    const [currentBranch, err2] = await execAsync(`git branch --show-current`);
    process.stderr.write(err2);
    const [result, err3] = await execAsync(
      `gh pr create --base ${base} --head ${currentBranch}`
    );
    process.stdout.write(result);
    process.stderr.write(err3);
  });

program
  .command("test")
  .description("just testing stuff for development")
  .action(async () => {
    console.log(process.stdout.columns, typeof process.stdout.columns);
  });

program.parse(process.argv);
