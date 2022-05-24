import chalk from "chalk";
import { exec, spawn } from "child_process";

export async function execAsync(cmd: string): Promise<[string, string]> {
  return new Promise(function (resolve, reject) {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve([stdout, stderr]);
    });
  });
}

export function spawnStep(cmd: string) {
  return new Promise((resolve, reject) => {
    console.log(chalk.dim("$ " + cmd));
    const process = spawn(cmd, {
      shell: true,
      stdio: "inherit",
    });
    process.on("error", reject);
    process.on("exit", function (code, signal) {
      if (code === null) {
        reject(new Error("process terminated with signal: " + String(signal)));
      }
      if (code !== 0) {
        reject(new Error("process exited with error code: " + String(code)));
      }
      // console.log("process exited with code " + code.toString());
      resolve(code);
    });
  });
}
