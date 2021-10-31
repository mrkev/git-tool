import { execAsync } from "./exec";
import nodegit from "nodegit";

export async function showOnGithub(prs: Array<nodegit.Reference>) {
  for (const pr of prs) {
    const [out, err] = await execAsync(`echo "will show ${pr.shorthand()}"`);
    process.stdout.write(out);
    process.stderr.write(err);
  }
}

export async function deleteBranches(brs: Array<nodegit.Reference>) {
  for (const br of brs) {
    const [out, err] = await execAsync(`echo "will delete ${br.shorthand()}"`);
    process.stdout.write(out);
    process.stderr.write(err);
  }
}
