import nodegit from "nodegit";
import os from "os";

export async function getRepo(): Promise<nodegit.Repository> {
  const path = await nodegit.Repository.discover(
    process.cwd(),
    0,
    os.homedir()
  );
  const repo = await nodegit.Repository.open(path);
  return repo;
}
