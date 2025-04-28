#!/usr/bin/env node

import chalk from "chalk";
import { spawn } from "child_process";
import { Command } from "commander";
import nodegit from "nodegit";
import pkg from "../package.json";
import { RefDeps } from "./RefDeps";
import { getTrunkRef, oidToRefMap } from "./branches";
import { execAsync } from "./exec";
import { ggAmend, ggDelmerged, ggGo, ggSync } from "./lib/gg";
import { ggBranch } from "./lib/gg-branch";
import { getRepo } from "./repo";

const program = new Command();
program.version(pkg.version);

program.action(() => ggBranch(null));

program
  .command("branch [branch]")
  .alias("b")
  .description("branch a branch/commit")
  .action((branch?: string) => ggBranch(branch || null));

program
  .command("go <message>")
  .description("syncs main")
  .action(async (message) => ggGo(message));

program.command("sync", "syncs main");

program
  .command("send <branchname> <message>", "creates and pushes a branch/commit")
  .alias("s");

program
  .command("amend")
  .alias("a")
  .description("amends/adds to the current diff")
  .action(async () => ggAmend());

// program
//   .command("move <ref> <dest>")
//   .description("rebases a commit/branch somewhere else")
//   .action((ref, dest) => {
//     // git checkout ref
//     // git rebase dest
//     // rebase branches dependant on this one?
//   });

program
  .command("delmerged")
  .description("rebases a commit/branch somewhere else")
  .action(async () => ggDelmerged());

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

function getRemoteForBranchShortname(shortname: string) {
  // git remote show origin
  // git rev-parse @{u} // u is upstraem apparently
  // git status -b --porcelain=v2 // machine readable
  `git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"`;
}

program
  .command("remote-test")
  .description("rebases a commit/branch somewhere else")
  .action(async () => {
    let result, err;
    try {
      [result, err] = await execAsync(
        `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
      );

      process.stdout.write(result);
      console.log("NOW ERRE");
      process.stderr.write(err);
    } catch (e) {
      //
      console.log(result);
    }
  });

//

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
    const repo = await getRepo();
    const refdeps = new RefDeps(repo);
    // console.log(await leastCommonAncestor("two", "main"));

    const headRef = await repo.head();
    const heaBranchName = headRef.shorthand();

    // console.log(await refdeps.parentForBranch(heaBranchName));
    console.log((await getTrunkRef(repo)).shorthand());
  });

program.parse(process.argv);
