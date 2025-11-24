// בס"ד
import { spawn } from "child_process";
import { asyncSpawnWrapper } from "../packages/better_child_process";


const composeActionID = 2;
const composeAction = process.argv[composeActionID];

const appNameID = 3;
const appName = process.argv[appNameID];

async function runDocker(name: string): Promise<void> {
  const script = [
    `-f .\\apps\\${name}\\docker-compose.yml`,
    `--env-file .\\.public.env`,
    `--env-file .\\.secret.env build`,
    composeAction
  ];

  return asyncSpawnWrapper(
    spawn("docker compose", script, {
      stdio: "inherit",
      shell: true,
    })
  );
}

runDocker(appName).catch((error: unknown) => {
  console.error(error);
});
