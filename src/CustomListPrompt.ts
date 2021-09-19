"use strict";
/**
 * `list` type prompt
 */

import findIndex from "lodash/findIndex";

import chalk from "chalk";
import figures from "figures";
import cliCursor from "cli-cursor";
// @ts-ignore
import runAsync from "run-async";
import { flatMap, map, take, takeUntil } from "rxjs/operators";
import observe from "inquirer/lib/utils/events";
import Paginator from "inquirer/lib/utils/paginator";

import Prompt from "inquirer/lib/prompts/base";
import inquirer from "inquirer";
import { Interface as ReadlineInterface } from "readline";
import Choices from "inquirer/lib/objects/choices";
const keypress = require("keypress");

export default class CustomListPrompt extends Prompt {
  /**
   * Resolves the value of the prompt.
   */
  protected done: (value: any) => void = undefined as any;

  /**
   * Gets or sets a value indicating whether the prompt has been rendered the first time.
   */
  protected firstRender: boolean;

  /**
   * The index of the selected choice.
   */
  protected selected: number;

  /**
   * Gets or sets an object for paginating the content.
   */
  protected paginator: Paginator;

  protected mode: "list" | "command" = "list";

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

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;

    const shouldLoop =
      (this.opt as any).loop === undefined ? true : (this.opt as any).loop;
    this.paginator = new (Paginator as any)(this.screen, {
      isInfinite: shouldLoop,
    });
  }

  /**
   * Start the Inquiry session
   */

  onKeypress = (
    char: string,
    key: {
      sequence: string;
      name: string;
      ctrl: boolean;
      meta: boolean;
      shift: boolean;
      code: string;
    }
  ): void => {
    // console.log(key);
    switch (key.name) {
      case "down":
      case "j":
        this.onDownKey();
        break;
      case "up":
      case "k":
        this.onUpKey();
        break;

      case "escape":
        this.mode = "command";
        break;

      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case "0":
        this.onNumberKey(parseInt(key.name));
        break;

      // case "return":
      default:
        break;
    }
  };

  _register() {
    process.stdin.on("keypress", this.onKeypress);
  }

  _unregister() {
    process.stdin.off("keypress", this.onKeypress);
  }

  _run(cb: (value: any) => void) {
    this.done = cb;

    const self = this;
    this._register();

    const events = observe(this.rl);
    // events.normalizedUpKey
    //   .pipe(takeUntil(events.line))
    //   .forEach(this.onUpKey.bind(this));
    // events.normalizedDownKey
    //   .pipe(takeUntil(events.line))
    //   .forEach(this.onDownKey.bind(this));
    // events.numberKey
    //   .pipe(takeUntil(events.line))
    //   .forEach(this.onNumberKey.bind(this) as any);

    events.line
      .pipe(
        take(1),
        map(this.getCurrentValue.bind(this)),
        flatMap((value: any) =>
          runAsync(self.opt.filter)(value, self.answers).catch(
            (err: any) => err
          )
        )
      )
      .forEach(this.onSubmit.bind(this));

    // Init the prompt
    cliCursor.hide();
    this.render();

    return this;
  }

  /**
   * Render the prompt to screen
   */
  render(): void {
    // Render question
    let message = this.getQuestion();

    if (this.firstRender) {
      message += chalk.dim("(Use arrow keys)");
      this.firstRender = false;
    }

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
      (this.screen as any).render(message);
      return;
    }

    // Render list
    const choicesStr = listRender(this.opt.choices, this.selected);
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

    (this.screen as any).render(message);
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
    this.done(value);
  }

  getCurrentValue(): void {
    return this.opt.choices.getChoice(this.selected).value;
  }

  /**
   * When user press a key
   */
  onUpKey = (): void => {
    this.selected = incrementListIndex(this.selected, "up", this.opt);
    this.render();
  };

  onDownKey = (): void => {
    this.selected = incrementListIndex(this.selected, "down", this.opt);
    this.render();
  };

  onNumberKey = (input: number): void => {
    if (input <= this.opt.choices.realLength) {
      this.selected = input - 1;
    }

    this.render();
  };
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices: Choices, pointer: number): string {
  let output = "";
  let separatorOffset = 0;

  choices.forEach((choice, i) => {
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
        (typeof choice.disabled === "string" ? choice.disabled : "Disabled") +
        ")";
      output += "\n";
      return;
    }

    const isSelected = i - separatorOffset === pointer;
    let line = (isSelected ? figures.pointer + " " : "  ") + choice.name;
    if (isSelected) {
      line = chalk.cyan(line);
    }

    output += line + " \n";
  });

  return output.replace(/\n$/, "");
}

function incrementListIndex(current: any, dir: any, opt: any) {
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
