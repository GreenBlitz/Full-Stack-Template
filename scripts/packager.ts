// בס"ד
import { spawn } from "child_process";
import { asyncSpawnWrapper } from "../packages/better_child_process";

const appNameID = 2;
const appName = process.argv[appNameID];

async function runDocker(name: string): Promise<void> {
  const script = `docker compose -f .\\apps\\${name}\\docker-compose.yml --env-file .\\.public.env up --env-file .\\.secret.env`;
  return asyncSpawnWrapper(
    spawn(script, {
      stdio: "inherit",
      shell: true,
    })
  );
}

runDocker(appName).catch((error: unknown) => {
  console.error(error);
});
