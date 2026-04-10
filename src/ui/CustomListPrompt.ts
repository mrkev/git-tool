/**
 * Custom list prompt built on @inquirer/core
 */

import {
  createPrompt,
  makeTheme,
  Separator,
  useKeypress,
  useMemo,
  usePagination,
  usePrefix,
  useRef,
  useState,
} from "@inquirer/core";
import chalk from "chalk";
import figures from "figures";

const CURSOR_HIDE = "\x1B[?25l";

type ComponentMode = "list" | "command" | "prompt";

export type CustomChoice<Value> = {
  value: Value;
  name: string;
  short: string;
  disabled?: boolean | string;
};

export type CustomListConfig<Value> = {
  message: string;
  choices: ReadonlyArray<CustomChoice<Value> | Separator>;
  default?: Value;
  pageSize?: number;
  loop?: boolean;
  onDelete?: (values: Value[]) => Promise<void>;
  onOpen?: (values: Value[]) => Promise<void>;
};

function isSelectable<Value>(item: CustomChoice<Value> | Separator): item is CustomChoice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

export default createPrompt(<Value>(config: CustomListConfig<Value>, done: (value: Value) => void) => {
  const { loop = true, pageSize = 7 } = config;

  const items = useMemo(() => [...config.choices], [config.choices]);

  const defaultIndex = useMemo(() => {
    if (config.default == null) return 0;
    const idx = items.findIndex((item) => isSelectable(item) && item.value === config.default);
    return Math.max(idx, 0);
  }, [config.default, items]);

  const [selected, setSelected] = useState(defaultIndex);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<ComponentMode>("list");
  const [commandInput, setCommandInput] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");
  // Prompt mode (inline y/n confirmation)
  const [promptQuestion, setPromptQuestion] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Value[] | null>(null);

  const firstRender = useRef(true);
  const prefix = usePrefix({ theme: makeTheme() });

  // Helper: get values for marked items (or just the selected item)
  const getSelectedValues = (): Value[] => {
    const indices = marked.size > 0 ? [...marked] : [selected];
    return indices
      .map((i) => items[i])
      .filter((item): item is CustomChoice<Value> => item != null && !Separator.isSeparator(item))
      .map((item) => item.value);
  };

  useKeypress((key, rl) => {
    switch (mode) {
      case "list": {
        rl.clearLine(0);
        setListMessage("");

        switch (key.name) {
          case "down":
          case "j": {
            let next = selected;
            do {
              next = loop ? (next + 1) % items.length : Math.min(items.length - 1, next + 1);
            } while (Separator.isSeparator(items[next]!) && next !== selected);
            setSelected(next);
            break;
          }
          case "up":
          case "k": {
            let next = selected;
            do {
              next = loop ? (next - 1 + items.length) % items.length : Math.max(0, next - 1);
            } while (Separator.isSeparator(items[next]!) && next !== selected);
            setSelected(next);
            break;
          }
          case "s": {
            const newMarked = new Set(marked);
            if (newMarked.has(selected)) {
              newMarked.delete(selected);
            } else {
              newMarked.add(selected);
            }
            setMarked(newMarked);
            break;
          }
          case "space":
            setSelected(defaultIndex);
            break;
          case "o": {
            if (!config.onOpen) break;
            const values = getSelectedValues();
            config
              .onOpen(values)
              .then(() => process.exit(0))
              .catch((err: unknown) => setListMessage(String(err)));
            break;
          }
          case "d": {
            if (!config.onDelete) break;
            const values = getSelectedValues();
            setPendingDelete(values);
            setPromptQuestion(`delete ${values.length} branches?`);
            setPromptInput("");
            setMode("prompt");
            break;
          }
          case "q":
            return void process.exit(0);
          case "escape":
            setMode("command");
            setCommandInput("");
            break;
          case "return": {
            const item = items[selected];
            if (item && isSelectable(item)) {
              setStatus("done");
              done(item.value);
            }
            break;
          }
        }
        break;
      }

      case "command": {
        if (key.name === "escape") {
          rl.clearLine(0);
          setMode("list");
          setCommandInput("");
        } else if (key.name === "return") {
          if (rl.line.trim() === "q") process.exit(0);
          rl.clearLine(0);
          setCommandInput("");
        } else {
          setCommandInput(rl.line);
        }
        break;
      }

      case "prompt": {
        if (key.name === "escape") {
          rl.clearLine(0);
          setMode("list");
          setPromptInput("");
          setPendingDelete(null);
        } else if (key.name === "return") {
          const answer = rl.line.trim().toLowerCase();
          rl.clearLine(0);
          if (answer === "y" && pendingDelete && config.onDelete) {
            const count = pendingDelete.length;
            config
              .onDelete(pendingDelete)
              .then(() => {
                setListMessage(`deleted ${count} branches`);
                setMode("list");
              })
              .catch((err: unknown) => {
                setListMessage(String(err));
                setMode("list");
              });
            setPendingDelete(null);
          } else if (answer === "n") {
            setListMessage(`didn't delete ${pendingDelete?.length ?? 0} branches`);
            setPendingDelete(null);
            setMode("list");
          }
          setPromptInput("");
        } else {
          setPromptInput(rl.line);
        }
        break;
      }
    }
  });

  // === Render ===

  const selectedItem = items[selected];
  const selectedShort = selectedItem && !Separator.isSeparator(selectedItem) ? selectedItem.short : "";

  // usePagination must be called unconditionally (hook ordering)
  const page = usePagination({
    items,
    active: selected,
    renderItem({ item, isActive, index }) {
      if (Separator.isSeparator(item)) {
        return `  ${item.separator}`;
      }

      if (item.disabled) {
        return `  - ${item.name} (${typeof item.disabled === "string" ? item.disabled : "Disabled"})`;
      }

      let line = (isActive ? figures.pointer + " " : "  ") + item.name;
      if (isActive) {
        line = mode !== "list" ? chalk.grey(line) : chalk.cyan(line);
      }
      if (marked.has(index)) {
        line = chalk.inverse(line);
      }

      return line;
    },
    pageSize,
    loop,
  });

  if (status === "done") {
    return `${prefix} ${chalk.bold(config.message)} ${chalk.cyan(selectedShort)}`;
  }

  let header = `${prefix} ${chalk.bold(config.message)}`;
  if (firstRender.current) {
    header += " " + chalk.dim("(Use vim navigation)");
    firstRender.current = false;
  }

  let footer = "";
  if (mode === "list") {
    footer = chalk.dim(listMessage);
  } else if (mode === "command") {
    footer = ":" + commandInput;
  } else if (mode === "prompt") {
    footer = `${promptQuestion} (y/N):${promptInput}`;
  }

  return `${header}\n${page}\n${footer}${CURSOR_HIDE}`;
});

export { Separator } from "@inquirer/core";
