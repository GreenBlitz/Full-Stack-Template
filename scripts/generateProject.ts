// בס"ד
import { readFile, writeFile, cp } from "fs/promises";
import process from "process";

const projectNameIndex = 2;

const changePackageName = async (folder: string, projectName: string) => {
  const packageJson = `apps/${projectName}/${folder}/package.json`;

  console.log("Changing package... ", packageJson);
  return readFile(packageJson, "utf-8")
    .then((data) => {
      console.log("Data", data);
      return data.replaceAll("template", projectName);
    })
    .then(async (data) => writeFile(packageJson, data));
};
const generate = () => {
  const projectName = process.argv[projectNameIndex];

  if (!projectName) {
    console.error("No Project Name Submitted!");
    return;
  }

  console.log(`Creating Project with name ${projectName}`);

  cp("apps/template", `apps/${projectName}`, { recursive: true })
    .then(async () =>
      Promise.all([
        changePackageName("frontend", projectName),
        changePackageName("backend", projectName),
      ])
    )
    .catch((error: unknown) => {
      console.error(error);
    });
};

generate();
