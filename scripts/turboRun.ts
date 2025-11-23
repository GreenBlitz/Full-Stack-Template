// בס"ד

import { spawn } from "child_process";
import * as process from "process";

const successStatus = 0;

async function runTurbo(task: string, filters: string[] = []): Promise<void> {
  const args = ["run", task, ...filters.map((f) => `--filter=${f}-frontend --filter=${f}-backend`)];

  return new Promise((resolve, reject) => {
    // Spawns the 'turbo' command with the specified arguments
    return spawn("turbo", args, {
      stdio: "inherit",
      shell: true,
    })
      .on("close", (code) => {
        if (code === successStatus) resolve();
        else reject(new Error(`Turbo process exited with code ${code}`));
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function verifyFilters(filters: string[]): string[] {
  return filters.filter((filter) => filter.startsWith("!"));
}

const scriptID = 2;
const script = process.argv[scriptID];

const filterStartingID = 3;
const filters = process.argv.slice(filterStartingID);

runTurbo(script, verifyFilters(filters)).catch((error: unknown) => {
  console.error(error);
});
