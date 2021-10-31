/**
 * `list` type prompt
 */

import findIndex from "lodash/findIndex";

import chalk from "chalk";
import figures from "figures";
import cliCursor from "cli-cursor";
// @ts-ignore
// import runAsync from "run-async";
// import { flatMap, map, take, takeUntil } from "rxjs/operators";
import observe from "inquirer/lib/utils/events";
import Paginator from "inquirer/lib/utils/paginator";

import Prompt from "inquirer/lib/prompts/base";
import inquirer from "inquirer";
import { Interface as ReadlineInterface } from "readline";
import Choices from "inquirer/lib/objects/choices";
import Choice from "inquirer/lib/objects/choice";
import Separator from "inquirer/lib/objects/separator";
import { deleteBranches, showOnGithub } from "./customListActions";

type ComponentMode = "list" | "command" | "prompt";
type KeypressKey = {
  sequence: string;
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  code: string;
};

export default class CustomListPrompt extends Prompt {
  /**
   * Resolves the value of the prompt.
   */
  protected done: ((value: any) => void) | null = null;

  /**
   * Gets or sets a value indicating whether the prompt has been rendered the first time.
   */
  protected firstRender: boolean;

  /**
   * The index of the selected choice.
   */
  protected selected: number;

  private readonly defaultSelected: number;

  /** Lines marked for a future operation */
  private marked: Set<number> = new Set();

  /**
   * Gets or sets an object for paginating the content.
   */
  protected paginator: Paginator;

  protected mode: ComponentMode = "list";

  // message that renders until next action on list
  private listMessage: string = "";

  // When on prompt mode, what gets called when done
  private promptCallback: ((answer: boolean) => void) | null = null;
  private promptQuestion: string = "";
  private promptInput: string = "";

  constructor(
    questions: inquirer.Question[],
    rl: ReadlineInterface,
    answers: inquirer.Answers
  ) {
    super(questions, rl, answers);

    if (!this.opt.choices) {
      this.throwParamError("choices");
    }

    this.firstRender = true;
    this.selected = 0;

    const def = this.opt.default;

    // If def is a Number, then use as index. Otherwise, check for value.
    if (
      typeof def === "number" &&
      def >= 0 &&
      def < this.opt.choices.realLength
    ) {
      this.selected = def;
    } else if (!(typeof def === "number") && def != null) {
      const index = findIndex(
        this.opt.choices.realChoices,
        ({ value }: any) => value === def
      );
      this.selected = Math.max(index, 0);
    }

    this.defaultSelected = this.selected;

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;

    const shouldLoop =
      (this.opt as any).loop === undefined ? true : (this.opt as any).loop;
    this.paginator = new (Paginator as any)(this.screen, {
      isInfinite: shouldLoop,
    });
  }

  onKeypress = (char: string, key: KeypressKey): void => {
    this.listMessage = "";
    switch (this.mode) {
      case "list":
        this.onListKeypress(char, key);
        break;
      case "command":
        this.onCommandKeypress(char, key);
        break;
      case "prompt":
        this.onPromptKeypress(char, key);
        break;
    }
  };

  _register() {
    process.stdin.on("keypress", this.onKeypress);
  }

  _unregister() {
    process.stdin.off("keypress", this.onKeypress);
  }

  _run(cb: (value: any) => void): this {
    this.done = cb;
    this._register();
    // Init the prompt
    cliCursor.hide();
    this.render();
    return this;
  }

  commandInput: string = "";
  executeCommand() {
    switch (this.commandInput) {
      case "q":
        process.exit(0);
        break;
      case "m":
        process.stderr.write(this.mode + "\n\n\n\n\n\n");
        break;

      case "del":
      case "delete":
      case "d":
        break;

      case "help":
        process.stderr.write(
          "commands: q (quit)qm (print mode)\n" + "immediates: "
        );

      case "pull":
      // TODO: same as git checkout [selected branch]
      //               git pull
      case "delmerged":
        // TODO: deletes all merged branches
        break;
    }
    this.commandInput = "";
  }

  private setMode(mode: ComponentMode): void {
    this.mode = mode;
    switch (mode) {
      case "command":
        cliCursor.show();
        break;
      case "list":
        this.commandInput = "";
        cliCursor.hide();
        break;
      case "prompt":
        cliCursor.show();
        break;
    }
    this.render();
  }

  onPromptKeypress(char: string, key: KeypressKey): void {
    switch (key.name) {
      case "backspace":
        if (this.commandInput.length === 0) {
          break;
        }
        this.commandInput = this.commandInput.slice(0, -1);
        this.render();

        break;
      case "escape":
        this.setMode("list");
        this.promptInput = "";
        break;

      case "return":
        if (!this.promptCallback) {
          throw new Error("No prompt callback");
        }
        const answer =
          this.promptInput.toLowerCase() === "y"
            ? true
            : this.promptInput.toLowerCase() === "n"
            ? false
            : "invalid";

        if (answer !== "invalid") {
          this.promptInput = "";
          this.promptCallback(answer);
          return;
        }

        this.promptInput = "";
        this.render();
        break;

      default:
        if (char != null && key.name !== "return") {
          this.promptInput += char;
          this.render();
        }
    }
  }

  onCommandKeypress(char: string, key: KeypressKey): void {
    switch (key.name) {
      case "backspace":
        if (this.commandInput.length === 0) {
          break;
        }

        this.commandInput = this.commandInput.slice(0, -1);
        this.render();

        break;
      case "escape":
        this.setMode("list");
        break;

      case "return":
        this.executeCommand();
        break;

      default:
        if (char != null && key.name !== "return") {
          this.commandInput += char;
          this.render();
        }
    }
  }

  async onListKeypress(char: string, key: KeypressKey): Promise<void> {
    // console.log(key);
    switch (key.name) {
      // Movement
      case "down":
      case "j":
        this.onDownKey();
        this.render();
        break;
      case "up":
      case "k":
        this.onUpKey();
        this.render();
        break;

      // Select/mark a branch
      case "s":
        if (this.marked.has(this.selected)) {
          this.marked.delete(this.selected);
        } else {
          this.marked.add(this.selected);
        }
        this.render();
        break;

      // Space "resets the camera" and selects the default branch
      case "space":
        this.selected = this.defaultSelected;
        this.render();
        break;

      // [B]rowse the pr for the branch on github
      case "o":
        {
          const indices =
            this.marked.size > 0 ? [...this.marked] : [this.selected];
          const branches = indices.map((i: number) => {
            const choice = this.opt.choices.getChoice(i).value;
            return choice;
          });

          await showOnGithub(branches);
          console.log("shown!");
          process.exit(0);
        }
        break;

      // d deletes branches
      case "d":
        {
          const indices =
            this.marked.size > 0 ? [...this.marked] : [this.selected];
          const branches = indices.map((i: number) => {
            const choice = this.opt.choices.getChoice(i).value;
            return choice;
          });

          const confirmed = await this.confirmAsync(
            `delete ${branches.length} branches?`
          );

          if (confirmed) {
            await deleteBranches(branches);
            this.listMessage = `deleted ${branches.length} branches`;
          } else {
            this.listMessage = `didn't delete ${branches.length} branches`;
          }
          this.setMode("list");
          this.render();
        }
        break;

      // Q quits immediately
      case "q":
        process.exit(0);
        break;

      // Esc enters command mode
      case "escape":
        this.setMode("command");
        break;

      case "return":
        const value = this.getCurrentValue();
        // I think I copied this correctly?
        const filtered = (this.opt.filter as any)(value, this.answers);
        // .catch(
        //   (err: any) => err
        // );
        this.onSubmit(filtered);

      default:
        break;
    }
  }

  private async confirmAsync(question: string): Promise<boolean> {
    return new Promise((res) => {
      this.setMode("prompt");
      this.promptCallback = res;
      this.promptQuestion = question;
      this.render();
    });
  }

  private confirm(question: string, cb: (answer: boolean) => void) {
    this.setMode("prompt");
    this.promptCallback = cb;
    this.promptQuestion = question;
    this.render();
  }

  /**
   * Render the prompt to screen
   */
  render(): void {
    // Render question
    let message = this.getQuestion();

    if (this.firstRender) {
      message += chalk.dim("(Use vim navigation)");
      this.firstRender = false;
    }

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
      (this.screen as any).render(message);
      return;
    }

    // Render list
    const choicesStr = this.listRender(
      this.opt.choices,
      this.selected,
      this.marked
    );
    const indexPosition = this.opt.choices.indexOf(
      this.opt.choices.getChoice(this.selected) as any
    );
    const realIndexPosition =
      (this.opt.choices as any).reduce((acc: number, value: any, i: number) => {
        // Dont count lines past the choice we are looking at
        if (i > indexPosition) {
          return acc;
        }
        // Add line if it's a separator
        if (value.type === "separator") {
          return acc + 1;
        }

        let l = value.name;
        // Non-strings take up one line
        if (typeof l !== "string") {
          return acc + 1;
        }

        // Calculate lines taken up by string
        l = l.split("\n");
        return acc + l.length;
      }, 0) - 1;
    message +=
      "\n" +
      (this.paginator as any).paginate(
        choicesStr,
        realIndexPosition,
        (this.opt as any).pageSize
      );

    // Line for commands
    if (this.mode === "list") {
      message += "\n" + chalk.dim(this.listMessage);
    } else if (this.mode === "command") {
      // const dimMessage = "(q: quit, /: search)";
      message += "\n:" + this.commandInput;
    } else if (this.mode === "prompt") {
      message += `\n${this.promptQuestion} (y/N):` + this.promptInput;
    }

    this.screen.render(message, "");
  }

  listRender(choices: Choices, pointer: number, marked: Set<number>): string {
    let output = "";
    let separatorOffset = 0;

    const filter =
      this.commandInput[0] === "/" ? this.commandInput.substring(1) : "";

    choices
      .filter(((choice: Choice<any> | Separator) => {
        if (filter === "") {
          return true;
        }
        return (
          !(choice instanceof Separator) && choice.short.indexOf(filter) > -1
        );
      }) as any)
      .forEach((choice, i) => {
        if (choice.type === "separator") {
          separatorOffset++;
          output += "  " + choice + "\n";
          return;
        }

        if (choice.disabled) {
          separatorOffset++;
          output += "  - " + choice.name;
          output +=
            " (" +
            (typeof choice.disabled === "string"
              ? choice.disabled
              : "Disabled") +
            ")";
          output += "\n";
          return;
        }

        const isSelected = i - separatorOffset === pointer;
        let line = (isSelected ? figures.pointer + " " : "  ") + choice.name;
        if (isSelected) {
          line = chalk.cyan(line);
        }

        if (marked.has(i)) {
          line = chalk.inverse(line);
        }

        output += line + " \n";
      });

    return output.replace(/\n$/, "");
  }

  /**
   * When user press `enter` key
   */

  onSubmit(value: any): void {
    this.status = "answered";

    // Rerender prompt
    this.render();

    this.screen.done();
    cliCursor.show();
    if (this.done == null) {
      throw new Error("No finall callback!");
    } else {
      this.done(value);
    }
  }

  getCurrentValue(): void {
    return this.opt.choices.getChoice(this.selected).value;
  }

  /**
   * When user press a key
   */
  onUpKey = (): void => {
    this.selected = incrementListIndex(this.selected, "up", this.opt);
  };

  onDownKey = (): void => {
    this.selected = incrementListIndex(this.selected, "down", this.opt);
  };
}

function incrementListIndex(current: number, dir: "up" | "down", opt: any) {
  const len = opt.choices.realLength;
  const shouldLoop = "loop" in opt ? Boolean(opt.loop) : true;
  if (dir === "up") {
    if (current > 0) {
      return current - 1;
    }
    return shouldLoop ? len - 1 : current;
  }
  if (dir === "down") {
    if (current < len - 1) {
      return current + 1;
    }
    return shouldLoop ? 0 : current;
  }
  throw new Error("dir must be up or down");
}
