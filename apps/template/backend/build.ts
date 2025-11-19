// בס"ד
import { build, context } from "esbuild";
import { spawn } from "child_process";


const isDev = Boolean(process.env.DEV);

const bundlePath = "dist/bundle.js";


const buildSettings = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/bundle.js",
  bundle: true,
  plugins: [],
  minify: true,
  platform: "node",
  target: ["node16"],
} satisfies Parameters<typeof build>[0];

const buildDev = async () =>
  context(buildSettings)
    .then(async (ctx) => ctx.watch())
    .then(() => {
      console.log("Starting nodemon to manage execution of bundle.js");
      spawn("nodemon",[bundlePath,"--watch",bundlePath, "--ext","js", "--exec","node",],{stdio: "inherit",shell: true});
    });



const buildedProject = isDev ? buildDev() : build(buildSettings);




buildedProject.catch((error: unknown) => {
  console.warn(error);
});
