import nodegit from "nodegit";
import chalk from "chalk";

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
  if (status.isDeleted()) {
    words.push("DELETED");
    color = chalk.red;
  }

  return [words.join(" "), color];
}

export async function getStatusText(
  repo: nodegit.Repository
): Promise<Array<string>> {
  const statuses = await repo.getStatus();

  let longestPrefixLen = 0;
  for (let file of statuses) {
    const [words] = statusToText(file);
    longestPrefixLen =
      words.length > longestPrefixLen ? words.length : longestPrefixLen;
  }

  return statuses.map(function (file) {
    const [words, color] = statusToText(file);

    return color(words.padEnd(longestPrefixLen + 1, " ") + file.path());
  });
}
