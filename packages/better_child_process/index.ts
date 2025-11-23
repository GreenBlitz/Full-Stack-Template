// בס"ד
import type { ChildProcess } from "child_process";

const successStatus = 0;

export const asyncSpawnWrapper = async (spawned: ChildProcess): Promise<void> =>
  new Promise((resolve, reject) =>
    spawned
      .on("close", (code) => {
        if (code === successStatus) resolve();
        else reject(new Error(`Process exited with code ${code}`));
      })
      .on("error", (err) => {
        reject(err);
      })
  );
