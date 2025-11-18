// בס"ד
import fs from "fs";
import process from "process";

const projectNameIndex = 2;

const generate = () => {
  const projectName = process.argv[projectNameIndex];

  if (!projectName) {
    console.error("No Project Name Submitted!");
    return;
  }

  console.log(`Creating Project with name ${projectName}`);

  fs.cp("apps/template", `apps/${projectName}`,{recursive: true}, (error: unknown) => {
    console.error(error);
  });
};

generate();
