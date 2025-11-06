// בס"ד
import { build, context } from "esbuild";

const isDev = Boolean(process.env.DEV);

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
      console.log("Watching For Backend Changes");
    });

const buildedProject = isDev ? buildDev() : build(buildSettings);
buildedProject.catch((error: unknown) => {
  console.warn(error);
});
