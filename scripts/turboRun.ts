// בס"ד

import { spawn } from "child_process";
import { asyncSpawnWrapper } from "../packages/better_child_process";

async function runTurbo(task: string, filters: string[] = []): Promise<void> {
  const args = [
    "run",
    task,
    ...filters.map((f) => `--filter=${f}-frontend --filter=${f}-backend`),
  ];

  return asyncSpawnWrapper(
    spawn("turbo", args, {
      stdio: "inherit",
      shell: true,
    })
  );
}

function verifyFilters(filters: string[]): string[] {
  return filters.filter(
    (filter) => filter.startsWith("!") && !filter.includes("&")
  );
}

const scriptID = 2;
const script = process.argv[scriptID];

const filterStartingID = 3;
const filters = process.argv.slice(filterStartingID);

runTurbo(script, verifyFilters(filters)).catch((error: unknown) => {
  console.error(error);
});
