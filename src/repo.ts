import nodegit from "nodegit";

export async function getRepo(): Promise<nodegit.Repository> {
  const path = await nodegit.Repository.discover(
    process.cwd(),
    0,
    require("os").homedir()
  );
  const repo = await nodegit.Repository.open(path);
  return repo;
}
