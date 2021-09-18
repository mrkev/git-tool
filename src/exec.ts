import { exec } from "child_process";

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
