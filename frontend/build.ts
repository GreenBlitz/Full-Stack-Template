// בס"ד
import { build } from "esbuild";

function createBuildSettings() {
  return {
    entryPoints: ["src/main.ts"],
    outfile: "dist/bundle.js",
    bundle: true,
    plugins: [],
    minify: true,
    platform: "node",
    target: ["node16"],
  } satisfies Parameters<typeof build>[0];
}
build(createBuildSettings()).catch((error: unknown) => {
  console.warn(error);
});
