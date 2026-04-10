import chalk from "chalk";
import figures from "figures";
import Choice from "inquirer/lib/objects/choice";
import Choices from "inquirer/lib/objects/choices";
import Separator from "inquirer/lib/objects/separator.js";

type ComponentMode = "list" | "command" | "prompt";

export function listRender(
  choices: Choices,
  state: {
    pointer: number;
    marked: Set<number>;
    commandInput: string;
    mode: ComponentMode;
  },
): string {
  let output = "";
  let separatorOffset = 0;

  const filter = state.commandInput[0] === "/" ? state.commandInput.substring(1) : "";

  const filtered = choices.filter((choice: Choice | Separator): choice is Choice | Separator => {
    if (filter === "") {
      return true;
    }
    return !(choice instanceof Separator) && choice.short.indexOf(filter) > -1;
  });

  for (let i = 0; i < filtered.length; i++) {
    const choice = filtered[i];
    if (choice.type === "separator") {
      separatorOffset++;
      output += "  " + choice + "\n";
      continue;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += "  - " + choice.name;
      output += " (" + (typeof choice.disabled === "string" ? choice.disabled : "Disabled") + ")";
      output += "\n";
      continue;
    }

    const isSelected = i - separatorOffset === state.pointer;
    let line = (isSelected ? figures.pointer + " " : "  ") + choice.name;
    if (isSelected) {
      const listDisabled = state.mode !== "list";
      line = listDisabled ? chalk.grey(line) : chalk.cyan(line);
    }

    if (state.marked.has(i)) {
      line = chalk.inverse(line);
    }

    output += line + " \n";
  }

  return output.replace(/\n$/, "");
}
